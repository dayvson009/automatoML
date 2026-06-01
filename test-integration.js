const fs = require('fs');
const path = require('path');

async function run() {
  console.log("--- 1. Limpando tabelas antigas para teste ---");
  const dataDir = path.join(__dirname, 'data');
  if (fs.existsSync(dataDir)) {
    ['ml_accounts.json', 'message_flows.json', 'flow_messages.json', 'notifications_log.json'].forEach(f => {
      const p = path.join(dataDir, f);
      if (fs.existsSync(p)) {
        fs.unlinkSync(p);
        console.log(`Deletado: ${f}`);
      }
    });
  }

  console.log("\n--- 2. Realizando Login ---");
  const loginRes = await fetch("http://localhost:3000/api/auth/login", {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: "admin@admin.com", password: "admin123" })
  });
  const loginData = await loginRes.json();
  console.log("Login Status:", loginRes.status, loginData);

  const cookie = loginRes.headers.get('set-cookie');
  console.log("Cookie de Sessão obtido:", cookie ? "Sim (secreto)" : "Não");

  console.log("\n--- 3. Criando conta Mercado Livre ---");
  const accRes = await fetch("http://localhost:3000/api/mlAccounts", {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Cookie': cookie
    },
    body: JSON.stringify({
      nickname: "Loja de Teste",
      app_id: "7751052017023270",
      secret_key: "o4Yi4mtpVgVQPiHgx1ug51ZER9dAKDSf",
      redirect_uri: "https://7e3c-179-48-228-37.ngrok-free.app/tg",
      notification_emails: "test@example.com"
    })
  });
  const acc = await accRes.json();
  console.log("Conta criada:", acc);

  console.log("\n--- 4. Inserindo tokens mockados diretamente no banco JSON ---");
  const accountsPath = path.join(dataDir, 'ml_accounts.json');
  let accounts = JSON.parse(fs.readFileSync(accountsPath, 'utf8'));
  if (!Array.isArray(accounts)) accounts = [accounts];
  accounts[0].ml_user_id = "3081727995";
  accounts[0].access_token = "MOCK_APP_TOKEN";
  accounts[0].refresh_token = "MOCK_REFRESH_TOKEN";
  accounts[0].token_expires_at = String(Date.now() + 86400000);
  fs.writeFileSync(accountsPath, JSON.stringify(accounts, null, 2));
  console.log("Tabela ml_accounts atualizada com tokens!");

  console.log("\n--- 5. Criando programa/fluxo ---");
  const flowRes = await fetch("http://localhost:3000/api/flows", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookie
    },
    body: JSON.stringify({
      ml_account_id: acc.id,
      name: "Programa Teste Corel",
      product_id: "MLB2077665752"
    })
  });
  const flow = await flowRes.json();
  console.log("Fluxo criado:", flow);

  console.log("\n--- 6. Criando mensagens do fluxo na DB ---");
  const messagesPath = path.join(dataDir, 'flow_messages.json');
  const messages = [
    {
      id: 1,
      flow_id: flow.id,
      step_order: 1,
      message_text: "Olá {{nameClient}}! Obrigado por comprar o Corel Draw.",
      attachment_path: null,
      after_seconds: 1,
      created_at: new Date().toISOString()
    },
    {
      id: 2,
      flow_id: flow.id,
      step_order: 2,
      message_text: "Seu link de download está pronto! Obrigado.",
      attachment_path: null,
      after_seconds: 2,
      created_at: new Date().toISOString()
    }
  ];
  fs.writeFileSync(messagesPath, JSON.stringify(messages, null, 2));
  console.log("Mensagens de fluxo configuradas!");

  console.log("\n--- 7. Disparando notificação webhook ---");
  const webhookRes = await fetch("http://localhost:3000/notificacao", {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      resource: "/orders/2000003508172799",
      topic: "orders_v2",
      user_id: 3081727995,
      application_id: 7751052017023270
    })
  });
  const webhookText = await webhookRes.text();
  console.log("Webhook status:", webhookRes.status, "Resposta:", webhookText);

  console.log("\n--- 8. Aguardando processamento assíncrono do webhook (4 segundos) ---");
  await new Promise(r => setTimeout(r, 4000));

  console.log("\n--- 9. Buscando logs gerados pela API ---");
  const logsRes = await fetch("http://localhost:3000/api/logs", {
    headers: { 'Cookie': cookie }
  });
  const logs = await logsRes.json();
  console.log("Logs de Atividades registrados no banco:\n", JSON.stringify(logs, null, 2));
}

run().catch(console.error);
