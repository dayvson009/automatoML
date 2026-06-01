const nodemailer = require('nodemailer');

/**
 * Envia uma notificação por e-mail para um ou mais destinatários.
 * @param {string} toEmails - E-mails separados por vírgula (ex: "email1@teste.com, email2@teste.com")
 * @param {string} subject - Assunto do e-mail
 * @param {string} text - Conteúdo em texto puro
 */
const sendNotificationEmail = async (toEmails, subject, text) => {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  if (!emailUser || !emailPass) {
    console.log('Envio de e-mail pulado: EMAIL_USER ou EMAIL_PASS não estão configurados no arquivo .env.');
    return;
  }

  // Transportador do Nodemailer para Gmail
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });

  const mailOptions = {
    from: `"Alerta ML SaaS" <${emailUser}>`,
    to: toEmails,
    subject: subject,
    text: text,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        <div style="background-color: #4f46e5; color: #ffffff; padding: 20px; text-align: center;">
          <h2 style="margin: 0; font-size: 20px; font-weight: bold;">Mercado Livre Notificações</h2>
        </div>
        <div style="padding: 24px; color: #1e293b; background-color: #ffffff;">
          <p style="font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
            ${text.replace(/\n/g, '<br>')}
          </p>
        </div>
        <div style="background-color: #f8fafc; padding: 12px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
          Alerta automático de vendas e mensagens - Mini-SaaS Mercado Livre
        </div>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('E-mail de notificação enviado com sucesso:', info.messageId);
    return info;
  } catch (error) {
    console.error('Erro ao enviar e-mail de notificação:', error);
  }
};

module.exports = { sendNotificationEmail };
