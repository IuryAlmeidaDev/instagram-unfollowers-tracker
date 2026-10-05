// api/create.js
module.exports = async function handler(req, res) {
  // Trata requisições OPTIONS de CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }

  const token = process.env.PUSHIN_PAY_TOKEN;

  // Se o token ainda não estiver configurado na Vercel, opera em modo Simulado de Teste
  if (!token) {
    const mockId = 'mock_' + Date.now();
    return res.status(200).json({
      success: true,
      transactionId: mockId,
      qrCode: '00020126580014br.gov.bcb.pix0136123e4567-e89b-12d3-a456-42661417400052040000530398654049.995802BR5913DEV_TESTE6009SAO_PAULO62070503***6304ABCD',
      qrCodeBase64: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="%23ffffff"/><text x="100" y="100" font-family="Arial" font-size="14" fill="%23000000" text-anchor="middle">QR CODE TESTE (SIMULADO)</text><text x="100" y="125" font-family="Arial" font-size="11" fill="%23666666" text-anchor="middle">Configure PUSHIN_PAY_TOKEN</text></svg>',
      expiresInSeconds: 900,
      isMock: true
    });
  }

  try {
    const response = await fetch('https://api.pushinpay.com.br/api/pix/cashIn', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        value: 999 // R$ 9,99 em centavos
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Erro Pushin Pay:', data);
      return res.status(response.status).json({
        success: false,
        error: data.message || 'Erro ao gerar Pix na Pushin Pay'
      });
    }

    return res.status(200).json({
      success: true,
      transactionId: data.id,
      qrCode: data.qr_code,
      qrCodeBase64: data.qr_code_base64,
      expiresInSeconds: 900
    });
  } catch (err) {
    console.error('Erro interno ao criar Pix:', err);
    return res.status(500).json({ success: false, error: 'Erro interno ao processar Pix' });
  }
};
