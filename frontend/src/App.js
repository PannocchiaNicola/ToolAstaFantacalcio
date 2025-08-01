import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Checkbox } from './components/ui/checkbox';
import { Badge } from './components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './components/ui/dialog';
import { Separator } from './components/ui/separator';
import { Plus, Edit2, Trash2, Target, TrendingUp, Users, DollarSign } from 'lucide-react';
import './App.css';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

function App() {
  const [players, setPlayers] = useState([]);
  const [budget, setBudget] = useState(null);
  const [budgetSummary, setBudgetSummary] = useState(null);
  const [activeTab, setActiveTab] = useState('portiere');
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [showBudgetDialog, setShowBudgetDialog] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [loading, setLoading] = useState(true);

  const roles = [
    { key: 'portiere', label: 'Portieri', icon: Target },
    { key: 'difensore', label: 'Difensori', icon: Users },
    { key: 'centrocampista', label: 'Centrocampisti', icon: TrendingUp },
    { key: 'attaccante', label: 'Attaccanti', icon: Target }
  ];

  const [newPlayer, setNewPlayer] = useState({
    name: '',
    team: '',
    role: 'portiere',
    goals: 0,
    assists: 0,
    is_penalty_taker: false,
    is_starter: false,
    price_paid: 0,
    max_desired_price: 0,
    is_primary_choice: true,
    priority_order: 1
  });

  const [budgetForm, setBudgetForm] = useState({
    total_budget: 500,
    portiere_budget: 10,
    difensore_budget: 90,
    centrocampista_budget: 200,
    attaccante_budget: 200
  });

  // Fetch data
  useEffect(() => {
    fetchPlayers();
    fetchBudget();
    fetchBudgetSummary();
  }, []);

  const fetchPlayers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/players`);
      const data = await response.json();
      setPlayers(data);
    } catch (error) {
      console.error('Error fetching players:', error);
    }
  };

  const fetchBudget = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/budget`);
      const data = await response.json();
      setBudget(data);
      setBudgetForm(data);
    } catch (error) {
      console.error('Error fetching budget:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBudgetSummary = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/budget/summary`);
      const data = await response.json();
      setBudgetSummary(data);
    } catch (error) {
      console.error('Error fetching budget summary:', error);
    }
  };

  const handleAddPlayer = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE_URL}/api/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPlayer)
      });
      if (response.ok) {
        await fetchPlayers();
        await fetchBudgetSummary();
        setNewPlayer({
          name: '',
          team: '',
          role: activeTab,
          goals: 0,
          assists: 0,
          is_penalty_taker: false,
          is_starter: false,
          price_paid: 0,
          max_desired_price: 0,
          is_primary_choice: true,
          priority_order: 1
        });
        setShowAddPlayer(false);
      }
    } catch (error) {
      console.error('Error adding player:', error);
    }
  };

  const handleUpdatePlayer = async (e) => {
    e.preventDefault();
    if (!editingPlayer) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/players/${editingPlayer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingPlayer)
      });
      if (response.ok) {
        await fetchPlayers();
        await fetchBudgetSummary();
        setEditingPlayer(null);
      }
    } catch (error) {
      console.error('Error updating player:', error);
    }
  };

  const handleDeletePlayer = async (playerId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/players/${playerId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        await fetchPlayers();
        await fetchBudgetSummary();
      }
    } catch (error) {
      console.error('Error deleting player:', error);
    }
  };

  const handleUpdateBudget = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE_URL}/api/budget`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(budgetForm)
      });
      if (response.ok) {
        await fetchBudget();
        await fetchBudgetSummary();
        setShowBudgetDialog(false);
      }
    } catch (error) {
      console.error('Error updating budget:', error);
    }
  };

  const getPlayersByRole = (role) => {
    return players
      .filter(player => player.role === role)
      .sort((a, b) => {
        if (a.is_primary_choice !== b.is_primary_choice) {
          return b.is_primary_choice - a.is_primary_choice;
        }
        return a.priority_order - b.priority_order;
      });
  };

  const getRoleBudgetInfo = (role) => {
    if (!budgetSummary) return { allocated: 0, spent: 0, remaining: 0, overflow: 0, max_desired_total: 0, player_count: 0 };
    return budgetSummary.roles[role] || { allocated: 0, spent: 0, remaining: 0, overflow: 0, max_desired_total: 0, player_count: 0 };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto mb-4"></div>
          <p className="text-slate-600">Caricamento in corso...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Fantacalcio Asta</h1>
                <p className="text-sm text-slate-600">Gestisci la tua asta perfetta</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {budgetSummary && (
                <div className="text-right">
                  <p className="text-sm text-slate-600">Budget speso / totale</p>
                  <p className="font-semibold text-slate-900">
                    {budgetSummary.total_spent.toFixed(0)} / {budgetSummary.total_budget.toFixed(0)} €
                  </p>
                  <p className="text-xs text-blue-600">
                    Max desiderato: {budgetSummary.total_max_desired.toFixed(0)} €
                  </p>
                </div>
              )}
              <Dialog open={showBudgetDialog} onOpenChange={setShowBudgetDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <DollarSign className="w-4 h-4 mr-2" />
                    Budget
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Configura Budget</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleUpdateBudget} className="space-y-4">
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="total_budget">Budget Totale (€)</Label>
                        <Input
                          id="total_budget"
                          type="number"
                          value={budgetForm.total_budget}
                          onChange={(e) => setBudgetForm({...budgetForm, total_budget: parseFloat(e.target.value) || 0})}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="portiere_budget">Portieri</Label>
                          <Input
                            id="portiere_budget"
                            type="number"
                            value={budgetForm.portiere_budget}
                            onChange={(e) => setBudgetForm({...budgetForm, portiere_budget: parseFloat(e.target.value) || 0})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="difensore_budget">Difensori</Label>
                          <Input
                            id="difensore_budget"
                            type="number"
                            value={budgetForm.difensore_budget}
                            onChange={(e) => setBudgetForm({...budgetForm, difensore_budget: parseFloat(e.target.value) || 0})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="centrocampista_budget">Centrocampisti</Label>
                          <Input
                            id="centrocampista_budget"
                            type="number"
                            value={budgetForm.centrocampista_budget}
                            onChange={(e) => setBudgetForm({...budgetForm, centrocampista_budget: parseFloat(e.target.value) || 0})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="attaccante_budget">Attaccanti</Label>
                          <Input
                            id="attaccante_budget"
                            type="number"
                            value={budgetForm.attaccante_budget}
                            onChange={(e) => setBudgetForm({...budgetForm, attaccante_budget: parseFloat(e.target.value) || 0})}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={() => setShowBudgetDialog(false)}>
                        Annulla
                      </Button>
                      <Button type="submit">Salva Budget</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white/50 backdrop-blur-sm">
            {roles.map((role) => {
              const budgetInfo = getRoleBudgetInfo(role.key);
              const Icon = role.icon;
              return (
                <TabsTrigger 
                  key={role.key} 
                  value={role.key}
                  className="flex flex-col items-center space-y-1 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-xs font-medium">{role.label}</span>
                  <div className="text-xs text-slate-500">
                    {budgetInfo.spent.toFixed(0)}€ / {budgetInfo.allocated.toFixed(0)}€
                  </div>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {roles.map((role) => {
            const roleInfo = getRoleBudgetInfo(role.key);
            const rolePlayers = getPlayersByRole(role.key);

            return (
              <TabsContent key={role.key} value={role.key} className="space-y-6">
                {/* Role Budget Summary */}
                <Card className="bg-white/70 backdrop-blur-sm border-slate-200">
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <p className="text-sm text-slate-600">Budget Assegnato</p>
                        <p className="text-2xl font-bold text-slate-900">{roleInfo.allocated.toFixed(0)}€</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-slate-600">Speso</p>
                        <p className="text-2xl font-bold text-emerald-600">{roleInfo.spent.toFixed(0)}€</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-slate-600">Rimanente</p>
                        <p className={`text-2xl font-bold ${roleInfo.remaining >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                          {roleInfo.remaining.toFixed(0)}€
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-slate-600">Sforamento</p>
                        <p className="text-2xl font-bold text-orange-600">{roleInfo.overflow.toFixed(0)}€</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Add Player Button */}
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-slate-900">{role.label}</h2>
                  <Dialog open={showAddPlayer} onOpenChange={setShowAddPlayer}>
                    <DialogTrigger asChild>
                      <Button onClick={() => setNewPlayer({...newPlayer, role: role.key})}>
                        <Plus className="w-4 h-4 mr-2" />
                        Aggiungi {role.label.slice(0, -1)}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Aggiungi Nuovo {role.label.slice(0, -1)}</DialogTitle>
                      </DialogHeader>
                      <PlayerForm 
                        player={newPlayer}
                        setPlayer={setNewPlayer}
                        onSubmit={handleAddPlayer}
                        onCancel={() => setShowAddPlayer(false)}
                        isEditing={false}
                      />
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Players List */}
                <div className="grid gap-4">
                  {rolePlayers.map((player) => (
                    <PlayerCard
                      key={player.id}
                      player={player}
                      onEdit={setEditingPlayer}
                      onDelete={handleDeletePlayer}
                    />
                  ))}
                  {rolePlayers.length === 0 && (
                    <Card className="bg-white/50 backdrop-blur-sm border-dashed border-2 border-slate-300">
                      <CardContent className="pt-8 pb-8 text-center">
                        <p className="text-slate-500">Nessun giocatore aggiunto per questo ruolo</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>
            );
          })}
        </Tabs>

        {/* Edit Player Dialog */}
        <Dialog open={!!editingPlayer} onOpenChange={() => setEditingPlayer(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Modifica Giocatore</DialogTitle>
            </DialogHeader>
            {editingPlayer && (
              <PlayerForm 
                player={editingPlayer}
                setPlayer={setEditingPlayer}
                onSubmit={handleUpdatePlayer}
                onCancel={() => setEditingPlayer(null)}
                isEditing={true}
              />
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}

// Player Form Component
function PlayerForm({ player, setPlayer, onSubmit, onCancel, isEditing }) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="name">Nome *</Label>
          <Input
            id="name"
            value={player.name}
            onChange={(e) => setPlayer({...player, name: e.target.value})}
            required
          />
        </div>
        <div>
          <Label htmlFor="team">Squadra *</Label>
          <Input
            id="team"
            value={player.team}
            onChange={(e) => setPlayer({...player, team: e.target.value})}
            required
          />
        </div>
        <div>
          <Label htmlFor="goals">Goal</Label>
          <Input
            id="goals"
            type="number"
            value={player.goals}
            onChange={(e) => setPlayer({...player, goals: parseInt(e.target.value) || 0})}
          />
        </div>
        <div>
          <Label htmlFor="assists">Assist</Label>
          <Input
            id="assists"
            type="number"
            value={player.assists}
            onChange={(e) => setPlayer({...player, assists: parseInt(e.target.value) || 0})}
          />
        </div>
        <div>
          <Label htmlFor="price_paid">Prezzo Pagato (€)</Label>
          <Input
            id="price_paid"
            type="number"
            step="0.5"
            value={player.price_paid}
            onChange={(e) => setPlayer({...player, price_paid: parseFloat(e.target.value) || 0})}
          />
        </div>
        <div>
          <Label htmlFor="max_desired_price">Prezzo Max Desiderato (€)</Label>
          <Input
            id="max_desired_price"
            type="number"
            step="0.5"
            value={player.max_desired_price}
            onChange={(e) => setPlayer({...player, max_desired_price: parseFloat(e.target.value) || 0})}
          />
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <Checkbox
          id="is_penalty_taker"
          checked={player.is_penalty_taker}
          onCheckedChange={(checked) => setPlayer({...player, is_penalty_taker: checked})}
        />
        <Label htmlFor="is_penalty_taker">Rigorista</Label>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="is_primary_choice"
          checked={player.is_primary_choice}
          onCheckedChange={(checked) => setPlayer({...player, is_primary_choice: checked})}
        />
        <Label htmlFor="is_primary_choice">Prima scelta</Label>
      </div>

      {!player.is_primary_choice && (
        <div>
          <Label htmlFor="priority_order">Ordine di priorità</Label>
          <Input
            id="priority_order"
            type="number"
            min="2"
            value={player.priority_order}
            onChange={(e) => setPlayer({...player, priority_order: parseInt(e.target.value) || 2})}
          />
        </div>
      )}

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annulla
        </Button>
        <Button type="submit">
          {isEditing ? 'Aggiorna' : 'Aggiungi'}
        </Button>
      </div>
    </form>
  );
}

// Player Card Component
function PlayerCard({ player, onEdit, onDelete }) {
  const isPrimary = player.is_primary_choice;
  
  return (
    <Card className={`transition-all duration-200 hover:shadow-md ${
      isPrimary 
        ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200 ring-1 ring-emerald-200' 
        : 'bg-white/60 backdrop-blur-sm border-slate-200'
    }`}>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <h3 className={`font-semibold ${isPrimary ? 'text-emerald-900' : 'text-slate-900'}`}>
                {player.name}
              </h3>
              {isPrimary && (
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 text-xs">
                  Prima Scelta
                </Badge>
              )}
              {!isPrimary && (
                <Badge variant="outline" className="text-xs">
                  Riserva #{player.priority_order}
                </Badge>
              )}
              {player.is_penalty_taker && (
                <Badge variant="outline" className="bg-yellow-100 text-yellow-800 text-xs">
                  Rigorista
                </Badge>
              )}
            </div>
            
            <div className="flex items-center space-x-4 text-sm text-slate-600 mb-2">
              <span className="font-medium">{player.team}</span>
              <span>⚽ {player.goals}</span>
              <span>🎯 {player.assists}</span>
            </div>
            
            <div className="flex items-center space-x-4 text-sm">
              <span className="text-emerald-600 font-medium">
                Pagato: {player.price_paid}€
              </span>
              <span className="text-blue-600">
                Max: {player.max_desired_price}€
              </span>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onEdit(player)}
            >
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onDelete(player.id)}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default App;