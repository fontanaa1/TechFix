import { useEffect, useState } from 'react';
import { LocalNotifications } from '@capacitor/local-notifications';

const OS = {
  codigo: 'TF-220',
  aparelho: 'Smartphone — Display',
  servico: 'Troca do display',
  valor: 349.90
};

export default function App() {
  const [permission, setPermission] = useState('checking');
  const [message, setMessage] = useState('Verificando permissão de notificações...');
  const [seconds, setSeconds] = useState(10);
  const [pending, setPending] = useState(0);
  const [showValue, setShowValue] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    refreshPermission();
    refreshPending();
  }, []);

  async function refreshPermission() {
    try {
      const result = await LocalNotifications.checkPermissions();
      setPermission(result.display);
      setMessage(result.display === 'granted'
        ? 'Notificações autorizadas neste dispositivo.'
        : 'Autorize as notificações para receber atualizações da assistência.');
    } catch (error) {
      setPermission('unavailable');
      setMessage('Não foi possível consultar as permissões. Abra o app em um dispositivo Android.');
    }
  }

  async function requestPermission() {
    setBusy(true);
    try {
      let result = await LocalNotifications.checkPermissions();
      if (result.display !== 'granted') result = await LocalNotifications.requestPermissions();
      setPermission(result.display);
      setMessage(result.display === 'granted'
        ? 'Permissão concedida! Você já pode receber atualizações.'
        : 'Permissão não concedida. Ative as notificações nas configurações do aparelho.');
    } catch (error) {
      setMessage(`Falha ao solicitar permissão: ${error?.message || 'erro desconhecido'}`);
    } finally {
      setBusy(false);
    }
  }

  async function ensurePermission() {
    let result = await LocalNotifications.checkPermissions();
    if (result.display !== 'granted') {
      result = await LocalNotifications.requestPermissions();
      setPermission(result.display);
    }
    if (result.display !== 'granted') {
      setMessage('Ação não realizada: permita notificações para continuar.');
      return false;
    }
    setPermission('granted');
    return true;
  }

  async function sendImmediate() {
    setBusy(true);
    try {
      if (!(await ensurePermission())) return;
      await LocalNotifications.schedule({
        notifications: [{
          title: 'TechFix Assistência',
          body: 'Seu smartphone passou de Em Análise para Pronto! O conserto do display foi concluído com sucesso.',
          id: 220,
          schedule: { at: new Date(Date.now() + 1000) },
          extra: { ordemServico: OS.codigo, status: 'Pronto' }
        }]
      });
      setMessage('Atualização enviada! Confira a notificação do TechFix no aparelho.');
      await refreshPending();
    } catch (error) {
      setMessage(`Erro ao enviar notificação: ${error?.message || 'verifique o dispositivo'}`);
    } finally {
      setBusy(false);
    }
  }

  async function scheduleUpdate() {
    const delay = Math.max(5, Math.min(3600, Number(seconds) || 10));
    setBusy(true);
    try {
      if (!(await ensurePermission())) return;
      const at = new Date(Date.now() + delay * 1000);
      await LocalNotifications.schedule({
        notifications: [{
          title: 'TechFix Assistência',
          body: 'Conserto do display concluído com sucesso! Status da OS TF-220: PRONTO.',
          id: 221,
          schedule: { at, allowWhileIdle: true },
          extra: { ordemServico: OS.codigo, status: 'Pronto' }
        }]
      });
      setMessage(`Notificação agendada para ${delay} segundos. Você pode sair do aplicativo.`);
      await refreshPending();
    } catch (error) {
      setMessage(`Erro ao agendar: ${error?.message || 'verifique o dispositivo'}`);
    } finally {
      setBusy(false);
    }
  }

  async function refreshPending() {
    try {
      const result = await LocalNotifications.getPending();
      setPending(result.notifications.length);
    } catch {
      setPending(0);
    }
  }

  async function cancelScheduled() {
    try {
      const result = await LocalNotifications.getPending();
      if (result.notifications.length) {
        await LocalNotifications.cancel({ notifications: result.notifications });
        setMessage('Notificações agendadas canceladas.');
      } else {
        setMessage('Não há notificações agendadas.');
      }
      await refreshPending();
    } catch (error) {
      setMessage(`Não foi possível cancelar: ${error?.message || 'erro desconhecido'}`);
    }
  }

  const permissionLabel = permission === 'granted' ? 'Autorizada' :
    permission === 'checking' ? 'Verificando...' : 'Não autorizada';

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-mark">TF</div>
        <div><strong>TechFix</strong><span>ASSISTÊNCIA TÉCNICA</span></div>
        <div className="top-pill">OS {OS.codigo}</div>
      </header>

      <section className="hero">
        <div className="eyebrow">ÁREA DO CLIENTE</div>
        <h1>Seu aparelho,<br /><em>em boas mãos.</em></h1>
        <p>Acompanhe cada etapa do conserto e receba avisos quando houver novidades.</p>
        <div className="device-art" aria-hidden="true">
          <div className="phone"><div className="phone-camera" /><div className="phone-screen"><span>TF</span><small>TECHFIX</small></div></div>
          <div className="orbit orbit-one" /><div className="orbit orbit-two" />
        </div>
      </section>

      <section className="panel order-panel">
        <div className="section-heading"><div><span className="eyebrow">ACOMPANHAMENTO</span><h2>Ordem de serviço</h2></div><span className="status-ready">● Em análise</span></div>
        <div className="order-number">{OS.codigo}<span> · {OS.aparelho}</span></div>
        <div className="progress-track"><div className="progress-fill" /></div>
        <div className="progress-labels"><span>Recebido</span><strong>Em análise</strong><span>Pronto</span></div>
        <div className="service-row"><span>Serviço solicitado</span><strong>{OS.servico}</strong></div>
        <div className="service-row"><span>Previsão</span><strong>Hoje, até 18h</strong></div>
      </section>

      <section className="panel notification-panel">
        <div className="eyebrow">CENTRAL DE NOTIFICAÇÕES</div>
        <h2>Fique por dentro.</h2>
        <p className="muted">Ative os avisos para saber quando o status do seu conserto mudar de <b>Em Análise</b> para <b>Pronto</b>.</p>
        <div className="permission-row"><span className={`permission-dot ${permission === 'granted' ? 'ok' : ''}`} /><div><b>Permissão do dispositivo</b><small>{permissionLabel}</small></div><button className="button button-outline compact" onClick={requestPermission} disabled={busy}>Ativar</button></div>
        <button className="button button-primary" onClick={sendImmediate} disabled={busy}>↗ &nbsp; Testar notificação agora</button>
        <div className="schedule-box">
          <label htmlFor="seconds">Agendar atualização de status</label>
          <div className="schedule-controls"><input id="seconds" type="number" min="5" max="3600" value={seconds} onChange={e => setSeconds(e.target.value)} /><span>segundos</span><button className="button button-dark" onClick={scheduleUpdate} disabled={busy}>Agendar</button></div>
          <small>O alerta será enviado mesmo se você fechar o aplicativo (conforme as permissões do sistema).</small>
        </div>
        <div className="pending-row"><span>Alertas agendados</span><b>{pending}</b><button onClick={cancelScheduled} className="text-button">Cancelar</button></div>
      </section>

      <section className="value-card">
        <div><span className="eyebrow">DESAFIO EXTRA</span><h2>Consultar valor da OS</h2><p>Consulte o orçamento do serviço solicitado.</p></div>
        <button className="button button-light" onClick={() => setShowValue(!showValue)}>{showValue ? 'Ocultar valor' : 'Consultar valor'} &nbsp; →</button>
        {showValue && <div className="price-detail"><span>Valor estimado · {OS.codigo}</span><strong>{OS.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong><small>Valor demonstrativo para a atividade. Confirme o orçamento com a assistência.</small></div>}
      </section>

      <div className="feedback" role="status"><span>●</span><div><b>STATUS DO SISTEMA</b><p>{message}</p></div></div>
      <footer>TECHFIX ASSISTÊNCIA <span>•</span> CUIDANDO DA SUA CONEXÃO</footer>
    </main>
  );
}