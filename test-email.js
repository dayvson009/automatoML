require('dotenv').config();
const { sendNotificationEmail } = require('./services/emailService');

async function test() {
  const destEmail = process.argv[2] || "deyvisonvinicius30@gmail.com";
  console.log("Iniciando teste de envio de e-mail...");
  console.log("EMAIL_USER:", process.env.EMAIL_USER);
  console.log("Destinatário:", destEmail);
  console.log("EMAIL_PASS:", process.env.EMAIL_PASS ? "*** (Configurado)" : "Não configurado");
  console.log("EMAIL_SERVICE:", process.env.EMAIL_SERVICE || "(Não definido, usará fallback smtp.gmail.com)");
  console.log("EMAIL_HOST:", process.env.EMAIL_HOST || "(Não definido)");
  console.log("EMAIL_PORT:", process.env.EMAIL_PORT || "(Não definido)");
  console.log("EMAIL_SECURE:", process.env.EMAIL_SECURE || "(Não definido)");

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error("Erro: EMAIL_USER ou EMAIL_PASS não configurados no .env");
    process.exit(1);
  }

  try {
    const info = await sendNotificationEmail(
      destEmail,
      "Teste de Configuração - Alerta ML",
      "Olá!\n\nEste é um e-mail de teste para verificar se as configurações de SMTP estão funcionando corretamente."
    );

    if (info) {
      console.log("\n✅ Sucesso! O e-mail foi enviado.");
      console.log("ID da mensagem:", info.messageId);
    } else {
      console.log("\n❌ Falha: O envio retornou vazio (verifique se o Nodemailer falhou internamente).");
    }
  } catch (error) {
    console.error("\n❌ Ocorreu um erro ao enviar o e-mail de teste:", error);
  }
}

test();
