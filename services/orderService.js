const axios = require('axios');

const getOrder = async (orderId, accessToken) => {
  try {
    const response = await axios.get(`https://api.mercadolibre.com/orders/${orderId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.data;
  } catch (error) {
    console.error('Erro ao obter ordem:', error.response ? error.response.data : error.message);
    throw new Error('Erro ao obter ordem');
  }
};

const getOrders = async (idUserVendedor, accessToken) => {
  try {
    const response = await axios.get(`https://api.mercadolibre.com/orders/search?seller=${idUserVendedor}&sort=date_desc`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    
    return response.data;
  } catch (error) {
    console.error('Erro ao obter ordens do vendedor:', error.response ? error.response.data : error.message);
    throw new Error('Erro ao obter ordens');
  }
};

module.exports = { getOrder, getOrders };
