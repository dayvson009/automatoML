require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const jwt = require('jsonwebtoken');
const db = require('./services/db');
const { authMiddleware, adminMiddleware, JWT_SECRET } = require('./services/authMiddleware');
const { getToken } = require('./services/authService');

// Importar rotas da API
const authRoutes = require('./routes/auth');
const mlAccountsRoutes = require('./routes/mlAccounts');
const flowsRoutes = require('./routes/flows');
const adminRoutes = require('./routes/admin');
const logsRoutes = require('./routes/logs');
const notificationsRoutes = require('./routes/notifications');
const ordersRoutes = require('./routes/orders');

const app = express();
const port = process.env.PORT || 3000;

// Configurar EJS como Template Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middlewares Globais
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// -------------------------------------------------------------
// ROTAS DE TELA (UI RENDER)
// -------------------------------------------------------------

// Redirecionamento da raiz
app.get('/', (req, res) => {
  res.redirect('/dashboard');
});

// Tela de Login / Registro
app.get('/login', (req, res) => {
  // Se o usuário já estiver logado, redireciona para o dashboard
  if (req.cookies && req.cookies.token) {
    try {
      jwt.verify(req.cookies.token, JWT_SECRET);
      return res.redirect('/dashboard');
    } catch (e) {
      // Token inválido, limpa cookie e segue para login
      res.clearCookie('token');
    }
  }
  res.render('login');
});

// Tela do Dashboard Principal
app.get('/dashboard', authMiddleware, (req, res) => {
  try {
    const accounts = db.find('ml_accounts', { user_id: req.user.id });
    const accountsCount = accounts.length;

    const accountIds = accounts.map(a => a.id);

    const flows = db.get('message_flows').filter(f => accountIds.includes(f.ml_account_id));
    const flowsCount = flows.length;

    const logs = db.get('notifications_log').filter(l => accountIds.includes(l.ml_account_id));
    const successCount = logs.filter(l => l.status === 'success').length;
    const errorCount = logs.filter(l => l.status === 'error').length;

    // Obter os 10 logs mais recentes com nickname da conta correspondente
    const recentLogsRaw = logs
      .sort((a, b) => b.id - a.id)
      .slice(0, 10);

    const recentLogs = recentLogsRaw.map(log => {
      const acc = accounts.find(a => a.id === log.ml_account_id);
      return {
        ...log,
        account_nickname: acc ? acc.nickname : 'Desconhecida'
      };
    });

    const baseUrl = req.protocol + '://' + req.get('host');

    res.render('dashboard', {
      title: 'Visão Geral',
      page: 'dashboard',
      header_title: 'Painel de Controle',
      header_subtitle: 'Visão geral do seu Mini-SaaS de atendimento automatizado',
      accountsCount,
      flowsCount,
      successCount,
      errorCount,
      recentLogs,
      baseUrl
    });
  } catch (error) {
    console.error('Erro ao carregar dashboard:', error);
    res.status(500).send('Erro interno ao carregar painel.');
  }
});

// Tela de Contas do Mercado Livre
app.get('/accounts', authMiddleware, (req, res) => {
  const baseUrl = req.protocol + '://' + req.get('host');
  res.render('accounts', {
    title: 'Contas Mercado Livre',
    page: 'accounts',
    header_title: 'Conectar Contas Mercado Livre',
    header_subtitle: 'Cadastre suas credenciais de aplicativo e autorize o acesso à sua loja',
    baseUrl
  });
});

// Tela de Editor de Fluxos / Programas de Mensagem
app.get('/flows', authMiddleware, (req, res) => {
  try {
    const accounts = db.find('ml_accounts', { user_id: req.user.id });
    res.render('flows', {
      title: 'Fluxos / Programas',
      page: 'flows',
      header_title: 'Fluxos de Mensagens Pós-Venda',
      header_subtitle: 'Crie e configure sequências automáticas de atendimento por produto',
      accounts
    });
  } catch (error) {
    console.error('Erro ao carregar fluxos:', error);
    res.status(500).send('Erro interno ao carregar editor de fluxos.');
  }
});

// Tela de Monitoramento de Logs de Notificações
app.get('/logs', authMiddleware, (req, res) => {
  res.render('logs', {
    title: 'Logs de Atividades',
    page: 'logs',
    header_title: 'Monitor de Notificações',
    header_subtitle: 'Acompanhe as vendas recebidas e o envio de mensagens em tempo real'
  });
});

// Tela de Administração Master (exclusiva para o admin)
app.get('/admin', authMiddleware, adminMiddleware, (req, res) => {
  res.render('admin', {
    title: 'Painel Admin Master',
    page: 'admin',
    header_title: 'Gerenciador de Usuários SaaS',
    header_subtitle: 'Habilite ou desabilite o acesso de clientes e gerencie assinaturas'
  });
});

// Callback de Autenticação OAuth do Mercado Livre
app.get('/tg', async (req, res) => {
  const code = req.query.code; // Código gerado pelo ML (TG-XXXX)
  const state = req.query.state; // ID da conta correspondente na nossa DB (ml_account_id)

  console.log("OAuth Callback recebido. Code:", code, "State (Account ID):", state);

  if (!code || !state) {
    return res.status(400).send("Código (code) ou Estado (state) ausentes.");
  }

  try {
    await getToken(code, state);
    res.send(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Conectado - Bot ML SaaS</title>
        <style>
          body {
            background: #f5f5f7;
            color: #333333;
            font-family: 'Inter', sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
          }
          .card {
            background: #ffffff;
            padding: 40px;
            border-radius: 12px;
            border: 1px solid #e6e6e6;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
            text-align: center;
            max-width: 420px;
          }
          h1 {
            color: #3483fa;
            margin-bottom: 20px;
            font-size: 28px;
            font-weight: 700;
          }
          p {
            color: #666666;
            font-size: 15px;
            line-height: 1.6;
            margin-bottom: 30px;
          }
          .btn {
            display: inline-block;
            padding: 12px 24px;
            background: #3483fa;
            color: #ffffff;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            transition: all 0.3s ease;
            box-shadow: 0 2px 6px rgba(52, 131, 250, 0.15);
          }
          .btn:hover {
            background: #2968c8;
            box-shadow: 0 4px 10px rgba(52, 131, 250, 0.25);
            transform: translateY(-2px);
          }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Conectado com Sucesso!</h1>
          <p>Sua conta do Mercado Livre foi autorizada e sincronizada com o nosso painel SaaS.</p>
          <a href="/accounts" class="btn">Ir para Configurações</a>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    console.error("Erro ao sincronizar token no callback /tg:", error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Erro de Conexão - Bot ML SaaS</title>
        <style>
          body { background: #f5f5f7; color: #333333; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
          .card { background: #ffffff; padding: 40px; border-radius: 12px; border: 1px solid #f73f55; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08); text-align: center; max-width: 420px; }
          h1 { color: #f73f55; margin-bottom: 20px; }
          p { color: #666666; line-height: 1.6; margin-bottom: 30px; }
          .btn { display: inline-block; padding: 12px 24px; background: #f0f2f5; color: #333333; text-decoration: none; border-radius: 8px; font-weight: 600; border: 1px solid #dcdfe4; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Falha na Autorização</h1>
          <p>Ocorreu um problema ao obter as credenciais de acesso do Mercado Livre: ${error.message}</p>
          <a href="/accounts" class="btn">Voltar e Tentar Novamente</a>
        </div>
      </body>
      </html>
    `);
  }
});

// -------------------------------------------------------------
// ROTAS DE API E WEBHOOKS
// -------------------------------------------------------------

app.use('/api/auth', authRoutes);
app.use('/api/mlAccounts', mlAccountsRoutes);
app.use('/api/flows', flowsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/logs', logsRoutes);
app.use('/notificacao', notificationsRoutes);
app.use('/order', ordersRoutes);

// Tratamento de erro 404 para rotas desconhecidas
app.use((req, res, next) => {
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(404).json({ error: 'Recurso não encontrado' });
  }
  res.status(404).send('Página não encontrada');
});

// Inicialização do Servidor
app.listen(port, () => {
  console.log(`=================================================`);
  console.log(`🚀 SERVIDOR MINI-SAAS ML INICIADO COM SUCESSO!`);
  console.log(`📡 Porta: ${port}`);
  console.log(`🌐 Local: http://localhost:${port}`);
  console.log(`=================================================`);
});
