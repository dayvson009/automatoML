const axios = require('axios');
const fs = require('fs');

async function uploadAttachment(filePath, accessToken) {
  // Nota: o site_id pode ser dinâmico ou mantido como MLB para Brasil (o código anterior tinha MLA, vamos manter o padrão ou adaptar).
  const url = 'https://api.mercadolibre.com/messages/attachments?tag=post_sale&site_id=MLB';

  const formData = {
    file: fs.createReadStream(filePath),
  };

  const headerConfig = {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'content-type': 'multipart/form-data',
    },
  };

  try {
    const response = await axios.post(url, formData, headerConfig);
    return response.data;
  } catch (error) {
    console.error('Erro ao enviar anexo:', error.response ? error.response.data : error.message);
    throw error;
  }
}

module.exports = { uploadAttachment };
