import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Save, Building2, MapPin, Settings, Loader2 } from 'lucide-react';

interface GeneralSettings {
  nome_clinica: string; // <-- AQUI ESTAVA O ERRO! Alterado de nome_organizacao para nome_clinica
  nif: string;
  email: string;
  telefone: string;
  morada: string;
  codigo_postal: string;
  cidade: string;
  fuso_horario: string;
  formato_data: string;
}

const defaultSettings: GeneralSettings = {
  nome_clinica: '',
  nif: '',
  email: '',
  telefone: '',
  morada: '',
  codigo_postal: '',
  cidade: '',
  fuso_horario: 'Europe/Lisbon',
  formato_data: 'DD/MM/AAAA',
};

export function GeneralSettingsTab() {
  const [settings, setSettings] = useState<GeneralSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('configuracoes')
        .select('*')
        .eq('id', 'global')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          nome_clinica: data.nome_clinica ?? '',
          nif: data.nif ?? '',
          email: data.email ?? '',
          telefone: data.telefone ?? '',
          morada: data.morada ?? '',
          codigo_postal: data.codigo_postal ?? '',
          cidade: data.cidade ?? '',
          fuso_horario: data.fuso_horario ?? 'Europe/Lisbon',
          formato_data: data.formato_data ?? 'DD/MM/AAAA',
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: 'Erro ao carregar',
        description: 'Não foi possível carregar as configurações.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from('configuracoes')
        .update({
          nome_clinica: settings.nome_clinica,
          nif: settings.nif,
          email: settings.email,
          telefone: settings.telefone,
          morada: settings.morada,
          codigo_postal: settings.codigo_postal,
          cidade: settings.cidade,
          fuso_horario: settings.fuso_horario,
          formato_data: settings.formato_data,
        })
        .eq('id', 'global');

      if (error) throw error;

      toast({
        title: 'Configurações guardadas',
        description: 'As definições foram atualizadas com sucesso.',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Erro ao guardar',
        description: 'Não foi possível guardar as configurações. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof GeneralSettings, value: string) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">A carregar configurações...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Configurações Gerais</h2>
        <p className="text-sm text-muted-foreground">
          Gerencie as informações da clínica, contactos e preferências do sistema.
        </p>
      </div>

      <Separator />

      {/* Cards Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Card 1: Identidade da Clínica */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4 text-primary" />
              Identidade da Clínica
            </CardTitle>
            <CardDescription>
              Informações principais da organização.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome_clinica">Nome da Organização</Label>
              <Input
                id="nome_clinica"
                value={settings.nome_clinica}
                onChange={(e) => updateField('nome_clinica', e.target.value)}
                placeholder="Ex: Casa de Saúde"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nif">NIF</Label>
              <Input
                id="nif"
                value={settings.nif}
                onChange={(e) => updateField('nif', e.target.value)}
                placeholder="Ex: 123456789"
              />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Contactos e Localização */}
        <Card className="lg:row-span-2">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-4 w-4 text-primary" />
              Contactos e Localização
            </CardTitle>
            <CardDescription>
              Dados de contacto e endereço da clínica.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={settings.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="geral@clinica.pt"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  type="tel"
                  value={settings.telefone}
                  onChange={(e) => updateField('telefone', e.target.value)}
                  placeholder="+351 200 000 000"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="morada">Morada</Label>
              <Input
                id="morada"
                value={settings.morada}
                onChange={(e) => updateField('morada', e.target.value)}
                placeholder="Rua Exemplo, nº 1"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="codigo_postal">Código Postal</Label>
                <Input
                  id="codigo_postal"
                  value={settings.codigo_postal}
                  onChange={(e) => updateField('codigo_postal', e.target.value)}
                  placeholder="1000-001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cidade">Cidade</Label>
                <Input
                  id="cidade"
                  value={settings.cidade}
                  onChange={(e) => updateField('cidade', e.target.value)}
                  placeholder="Lisboa"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Preferências */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Settings className="h-4 w-4 text-primary" />
              Preferências
            </CardTitle>
            <CardDescription>
              Fuso horário e formato de apresentação de datas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fuso_horario">Fuso Horário</Label>
              <Select
                value={settings.fuso_horario}
                onValueChange={(value) => updateField('fuso_horario', value)}
              >
                <SelectTrigger id="fuso_horario">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Europe/Lisbon">Europe/Lisbon (WET/WEST)</SelectItem>
                  <SelectItem value="Atlantic/Azores">Atlantic/Azores</SelectItem>
                  <SelectItem value="Atlantic/Madeira">Atlantic/Madeira</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="formato_data">Formato de Data</Label>
              <Select
                value={settings.formato_data}
                onValueChange={(value) => updateField('formato_data', value)}
              >
                <SelectTrigger id="formato_data">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DD/MM/AAAA">DD/MM/AAAA</SelectItem>
                  <SelectItem value="AAAA-MM-DD">AAAA-MM-DD</SelectItem>
                  <SelectItem value="MM/DD/AAAA">MM/DD/AAAA</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={saveSettings} disabled={saving} size="lg">
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {saving ? 'A guardar...' : 'Guardar Alterações'}
        </Button>
      </div>
    </div>
  );
}
