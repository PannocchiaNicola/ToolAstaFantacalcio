import requests
import sys
import json
from datetime import datetime

class FantasyFootballAPITester:
    def __init__(self, base_url="https://f3afc6b9-4eaf-4914-ac2a-90741922a926.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.created_players = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        if headers is None:
            headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if method == 'GET' and 'players' in endpoint:
                        print(f"   Response: Found {len(response_data) if isinstance(response_data, list) else 1} items")
                    elif data and method in ['POST', 'PUT']:
                        print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                except:
                    print(f"   Response: {response.text[:100]}...")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")

            return success, response.json() if response.text and response.status_code < 500 else {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test health endpoint"""
        success, response = self.run_test(
            "Health Check",
            "GET",
            "api/health",
            200
        )
        return success

    def test_get_initial_budget(self):
        """Test getting initial budget configuration"""
        success, response = self.run_test(
            "Get Initial Budget",
            "GET",
            "api/budget",
            200
        )
        if success:
            expected_keys = ['total_budget', 'portiere_budget', 'difensore_budget', 'centrocampista_budget', 'attaccante_budget']
            for key in expected_keys:
                if key not in response:
                    print(f"❌ Missing key in budget response: {key}")
                    return False
            print(f"   Budget: Total={response.get('total_budget')}€, Portieri={response.get('portiere_budget')}€")
        return success

    def test_get_budget_summary(self):
        """Test getting budget summary"""
        success, response = self.run_test(
            "Get Budget Summary",
            "GET",
            "api/budget/summary",
            200
        )
        if success:
            if 'roles' not in response:
                print("❌ Missing 'roles' in budget summary")
                return False
            roles = ['portiere', 'difensore', 'centrocampista', 'attaccante']
            for role in roles:
                if role not in response['roles']:
                    print(f"❌ Missing role in budget summary: {role}")
                    return False
            print(f"   Summary: Total spent={response.get('total_spent', 0)}€")
        return success

    def test_get_empty_players(self):
        """Test getting players when database is empty"""
        success, response = self.run_test(
            "Get Empty Players List",
            "GET",
            "api/players",
            200
        )
        return success

    def test_create_player(self, name, team, role, price_paid=10.0, is_primary=True, related_to_player_id=None):
        """Create a test player"""
        player_data = {
            "name": name,
            "team": team,
            "role": role,
            "goals": 5,
            "assists": 3,
            "is_penalty_taker": False,
            "price_paid": price_paid,
            "max_desired_price": price_paid + 5,
            "is_primary_choice": is_primary,
            "priority_order": 1 if is_primary else 2,
            "related_to_player_id": related_to_player_id
        }
        
        success, response = self.run_test(
            f"Create Player - {name}",
            "POST",
            "api/players",
            200,
            data=player_data
        )
        
        if success and 'id' in response:
            self.created_players.append(response['id'])
            print(f"   Created player with ID: {response['id']}")
            return response['id']
        return None

    def test_get_primary_players_by_role(self, role):
        """Test getting primary players by specific role for dropdown"""
        success, response = self.run_test(
            f"Get Primary Players by Role - {role}",
            "GET",
            f"api/players/primary/{role}",
            200
        )
        return success, response

    def test_relationship_system(self):
        """Test the new player relationship system"""
        print("\n🔗 Testing Player Relationship System")
        print("-" * 40)
        
        # Test creating primary and backup players with relationships
        role = "portiere"
        
        # Create primary players
        primary1_id = self.test_create_player("Butez", "Monza", role, 8.0, True)
        primary2_id = self.test_create_player("Leali", "Genoa", role, 6.0, True)
        
        if not primary1_id or not primary2_id:
            print("❌ Failed to create primary players for relationship test")
            return False
        
        # Test getting primary players for dropdown
        success, primaries = self.test_get_primary_players_by_role(role)
        if not success:
            print("❌ Failed to get primary players for dropdown")
            return False
        
        # Verify primary players are returned correctly
        primary_names = [p['name'] for p in primaries]
        if "Butez" not in primary_names or "Leali" not in primary_names:
            print("❌ Primary players not found in dropdown response")
            return False
        print(f"✅ Primary players dropdown: {primary_names}")
        
        # Create backup players related to specific primaries
        backup1_id = self.test_create_player("Skorupski", "Bologna", role, 5.0, False, primary1_id)
        backup2_id = self.test_create_player("Caprile", "Napoli", role, 4.0, False, primary2_id)
        
        if not backup1_id or not backup2_id:
            print("❌ Failed to create backup players with relationships")
            return False
        
        # Test getting players by role to verify organization
        success, organized_players = self.test_get_players_by_role(role)
        if not success:
            print("❌ Failed to get organized players by role")
            return False
        
        # Verify organization: primary followed by its backups
        print(f"✅ Player organization test:")
        for i, player in enumerate(organized_players):
            is_primary = player.get('is_primary_choice', True)
            related_to = player.get('related_to_player_id')
            print(f"   {i+1}. {player['name']} - {'Primary' if is_primary else f'Backup of {related_to}'}")
        
        # Verify budget calculations only include primary choices
        success, budget_summary = self.run_test(
            "Budget Summary with Relationships",
            "GET",
            "api/budget/summary",
            200
        )
        
        if success:
            role_info = budget_summary['roles'][role]
            primary_count = role_info['primary_choices_count']
            total_count = role_info['player_count']
            max_desired = role_info['max_desired_total']
            
            print(f"✅ Budget calculation: {primary_count} primary out of {total_count} total players")
            print(f"   Max desired total (primaries only): {max_desired}€")
            
            # Should be 2 primary players out of 4 total
            if primary_count != 2 or total_count != 4:
                print(f"❌ Expected 2 primary out of 4 total, got {primary_count} out of {total_count}")
                return False
        
        return True

    def test_update_player(self, player_id, updated_data):
        """Test updating a player"""
        success, response = self.run_test(
            f"Update Player - {player_id}",
            "PUT",
            f"api/players/{player_id}",
            200,
            data=updated_data
        )
        return success

    def test_delete_player(self, player_id):
        """Test deleting a player"""
        success, response = self.run_test(
            f"Delete Player - {player_id}",
            "DELETE",
            f"api/players/{player_id}",
            200
        )
        return success

    def test_update_budget(self):
        """Test updating budget configuration"""
        budget_data = {
            "total_budget": 600.0,
            "portiere_budget": 15.0,
            "difensore_budget": 100.0,
            "centrocampista_budget": 235.0,
            "attaccante_budget": 250.0
        }
        
        success, response = self.run_test(
            "Update Budget Configuration",
            "PUT",
            "api/budget",
            200,
            data=budget_data
        )
        return success

    def cleanup_created_players(self):
        """Clean up any players created during testing"""
        print(f"\n🧹 Cleaning up {len(self.created_players)} created players...")
        for player_id in self.created_players:
            try:
                requests.delete(f"{self.base_url}/api/players/{player_id}")
            except:
                pass

def main():
    print("🚀 Starting Fantasy Football API Tests")
    print("=" * 50)
    
    tester = FantasyFootballAPITester()
    
    try:
        # Basic API tests
        if not tester.test_health_check():
            print("❌ Health check failed, stopping tests")
            return 1

        if not tester.test_get_initial_budget():
            print("❌ Budget endpoint failed, stopping tests")
            return 1

        if not tester.test_get_budget_summary():
            print("❌ Budget summary failed, stopping tests")
            return 1

        if not tester.test_get_empty_players():
            print("❌ Players endpoint failed, stopping tests")
            return 1

        # Test player CRUD operations
        print("\n📝 Testing Player CRUD Operations")
        print("-" * 30)
        
        # Create test players for each role
        roles_to_test = [
            ("portiere", "Donnarumma", "PSG"),
            ("difensore", "Bastoni", "Inter"),
            ("centrocampista", "Barella", "Inter"),
            ("attaccante", "Osimhen", "Napoli")
        ]
        
        created_ids = []
        for role, name, team in roles_to_test:
            player_id = tester.test_create_player(name, team, role, 25.0, True)
            if player_id:
                created_ids.append((player_id, role, name))
            
            # Create a backup player for the same role
            backup_id = tester.test_create_player(f"{name} Backup", team, role, 15.0, False)
            if backup_id:
                created_ids.append((backup_id, role, f"{name} Backup"))

        # Test getting players by role
        for role, _, _ in roles_to_test:
            success, players = tester.test_get_players_by_role(role)
            if success:
                primary_count = sum(1 for p in players if p.get('is_primary_choice', True))
                backup_count = len(players) - primary_count
                print(f"   {role}: {primary_count} primary, {backup_count} backup players")

        # Test updating a player
        if created_ids:
            player_id, role, name = created_ids[0]
            updated_data = {
                "name": f"{name} Updated",
                "team": "Updated Team",
                "role": role,
                "goals": 10,
                "assists": 8,
                "is_penalty_taker": True,
                "price_paid": 30.0,
                "max_desired_price": 35.0,
                "is_primary_choice": True,
                "priority_order": 1
            }
            tester.test_update_player(player_id, updated_data)

        # Test budget update
        print("\n💰 Testing Budget Management")
        print("-" * 30)
        tester.test_update_budget()
        
        # Test budget summary after adding players
        tester.test_get_budget_summary()

        # Test deleting a player
        if created_ids:
            player_id, _, name = created_ids[-1]
            tester.test_delete_player(player_id)

    except KeyboardInterrupt:
        print("\n⚠️ Tests interrupted by user")
    except Exception as e:
        print(f"\n💥 Unexpected error: {str(e)}")
    finally:
        # Cleanup
        tester.cleanup_created_players()

    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed! Backend API is working correctly.")
        return 0
    else:
        print(f"⚠️ {tester.tests_run - tester.tests_passed} tests failed.")
        return 1

if __name__ == "__main__":
    sys.exit(main())