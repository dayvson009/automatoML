const axios = require('axios');
const nodemailer = require('nodemailer');

/**
 * Envia uma notificação por e-mail para um ou mais destinatários.
 * @param {string} toEmails - E-mails separados por vírgula (ex: "email1@teste.com, email2@teste.com")
 * @param {string} subject - Assunto do e-mail
 * @param {string} text - Conteúdo em texto puro
 */
const sendNotificationEmail = async (toEmails, subject, text) => {
  const htmlContent = `
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
  `;

  // 1. Verificar se o Resend está configurado no .env
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    const resendFrom = process.env.RESEND_FROM || 'onboarding@resend.dev';
    try {
      const response = await axios.post('https://api.resend.com/emails', {
        from: resendFrom,
        to: toEmails.split(',').map(email => email.trim()),
        subject: subject,
        html: htmlContent,
        text: text
      }, {
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('E-mail de notificação enviado com sucesso via Resend:', response.data.id);
      return { messageId: response.data.id };
    } catch (error) {
      console.error('Erro ao enviar e-mail de notificação via Resend:', error.response ? error.response.data : error.message);
      return null;
    }
  }

  // 2. Fallback para Nodemailer / SMTP tradicional
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  if (!emailUser || !emailPass) {
    console.log('Envio de e-mail pulado: Nem RESEND_API_KEY nem EMAIL_USER/EMAIL_PASS estão configurados no arquivo .env.');
    return;
  }

  const emailService = process.env.EMAIL_SERVICE;
  const emailHost = process.env.EMAIL_HOST;
  const emailPort = process.env.EMAIL_PORT ? Number(process.env.EMAIL_PORT) : null;
  const emailSecure = process.env.EMAIL_SECURE !== undefined ? process.env.EMAIL_SECURE === 'true' : null;

  let transportConfig;

  if (emailService) {
    transportConfig = {
      service: emailService,
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    };
  } else if (emailHost) {
    transportConfig = {
      host: emailHost,
      port: emailPort || 587,
      secure: emailSecure !== null ? emailSecure : (emailPort === 465),
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    };
  } else {
    // Fallback para Gmail SMTP sobre SSL (Porta 465)
    transportConfig = {
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    };
  }

  const transporter = nodemailer.createTransport(transportConfig);

  const mailOptions = {
    from: `"Alerta ML SaaS" <${emailUser}>`,
    to: toEmails,
    subject: subject,
    text: text,
    html: htmlContent
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('E-mail de notificação enviado com sucesso via SMTP:', info.messageId);
    return info;
  } catch (error) {
    console.error('Erro ao enviar e-mail de notificação via SMTP:', error);
  }
};

module.exports = { sendNotificationEmail };
