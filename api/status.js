// api/status.js
const { generateLicenseKey } = require('./license-utils');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ success: false, error: 'ID da transação não fornecido' });
  }

  const token = process.env.PUSHIN_PAY_TOKEN;

  // Suporte a transação simulada (modo Dev/Teste sem token)
  if (!token || String(id).startsWith('mock_')) {
    // No modo mock, simula aprovação automática se tiver passado mais de 10 segundos
    const timestamp = parseInt(String(id).replace('mock_', ''), 10) || 0;
    const isMockPaid = (Date.now() - timestamp) > 8000;

    if (isMockPaid) {
      return res.status(200).json({
        success: true,
        status: 'paid',
        licenseKey: generateLicenseKey(),
        isMock: true
      });
    }

    return res.status(200).json({
      success: true,
      status: 'created',
      isMock: true
    });
  }

  try {
    const response = await fetch(`https://api.pushinpay.com.br/api/transactions/${id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: data.message || 'Erro ao consultar status'
      });
    }

    const isPaid = data.status === 'paid';
    return res.status(200).json({
      success: true,
      status: data.status,
      licenseKey: isPaid ? generateLicenseKey() : null
    });
  } catch (err) {
    console.error('Erro interno ao consultar status:', err);
    return res.status(500).json({ success: false, error: 'Erro ao verificar pagamento' });
  }
};
