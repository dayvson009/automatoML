const axios = require('axios');
const qs = require('qs');
const db = require('./db');

/**
 * Obtém o token de acesso inicial do Mercado Livre usando o code (TG-XXX)
 * e o associa a uma conta ml_account_id específica.
 */
const getToken = async (code, accountId) => {
  const account = db.findOne('ml_accounts', { id: Number(accountId) });
  if (!account) {
    throw new Error('Conta do Mercado Livre não encontrada para associar o token.');
  }

  const settings = db.findOne('settings', { id: 1 }) || { redirect_uri: 'http://localhost:3000/tg' };
  const redirectUri = settings.redirect_uri;

  const data = qs.stringify({
    grant_type: 'authorization_code',
    client_id: account.app_id,
    client_secret: account.secret_key,
    code: code,
    redirect_uri: redirectUri,
  });

  try {
    const response = await axios.post('https://api.mercadolibre.com/oauth/token', data, {
      headers: {
        'accept': 'application/json',
        'content-type': 'application/x-www-form-urlencoded',
      },
    });

    const tokenData = response.data;
    // O retorno possui: access_token, refresh_token, expires_in, user_id (CustID do vendedor)
    console.log(`Token de Acesso obtido para a conta ID ${accountId}:`, tokenData.access_token);

    // Calcular o timestamp de expiração (Date.now() + segundos * 1000)
    const expiresAt = Date.now() + (tokenData.expires_in * 1000);

    // Atualizar os tokens e o ml_user_id do vendedor na conta
    db.update('ml_accounts', { id: account.id }, {
      ml_user_id: String(tokenData.user_id),
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_expires_at: String(expiresAt)
    });

    return tokenData;
  } catch (error) {
    console.error(`Erro ao obter o token para conta ID ${accountId}:`, error.response ? error.response.data : error.message);
    throw new Error('Erro ao obter o token do Mercado Livre');
  }
};

/**
 * Renova o token de acesso de uma conta específica usando seu refresh_token
 */
const refreshAccountToken = async (accountId) => {
  const account = db.findOne('ml_accounts', { id: Number(accountId) });
  if (!account || !account.refresh_token) {
    console.error(`Conta ID ${accountId} não encontrada ou não possui refresh_token.`);
    return null;
  }

  try {
    const response = await axios.post('https://api.mercadolibre.com/oauth/token', null, {
      params: {
        grant_type: 'refresh_token',
        client_id: account.app_id,
        client_secret: account.secret_key,
        refresh_token: account.refresh_token
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const tokenData = response.data;
    const expiresAt = Date.now() + (tokenData.expires_in * 1000);

    db.update('ml_accounts', { id: account.id }, {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_expires_at: String(expiresAt)
    });

    console.log(`Access Token renovado com sucesso para a conta: ${account.nickname}`);
    return tokenData.access_token;
  } catch (error) {
    console.error(`Erro ao renovar token da conta ${account.nickname}:`, error.response ? error.response.data : error.message);
    // Registrar log de erro
    db.insert('notifications_log', {
      ml_account_id: account.id,
      topic: 'auth_refresh',
      status: 'error',
      log_message: `Falha ao renovar token de acesso: ${error.message}`
    });
    return null;
  }
};

/**
 * Inicializa a verificação periódica de expiração de tokens para todas as contas
 */
const startTokenRefreshInterval = () => {
  // Executar a verificação a cada 15 minutos
  const CHECK_INTERVAL = 15 * 60 * 1000;

  setInterval(async () => {
    try {
      console.log('Verificando expiração de tokens do Mercado Livre...');
      const accounts = db.get('ml_accounts');
      const now = Date.now();

      for (const account of accounts) {
        if (!account.refresh_token || !account.token_expires_at) continue;

        // Se faltar menos de 1 hora (3600 segundos) para expirar, renovamos
        const expiresAtMs = Number(account.token_expires_at);
        const timeRemaining = expiresAtMs - now;

        if (timeRemaining < 60 * 60 * 1000) {
          console.log(`Token da conta "${account.nickname}" perto de expirar. Renovando...`);
          await refreshAccountToken(account.id);
        }
      }
    } catch (error) {
      console.error('Erro no ciclo de renovação automática de tokens:', error);
    }
  }, CHECK_INTERVAL);
};

// Iniciar o daemon de renovação automática
startTokenRefreshInterval();

module.exports = { getToken, refreshAccountToken };
