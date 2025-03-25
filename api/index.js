// api/dados.js

export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*"); // Permite acesso de qualquer origem (ou defina um domínio específico)
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end(); // Responde ao preflight CORS
  }

  if (req.method === "POST") {
    const dados = req.body; // Pegando os dados enviados no POST
    console.log("Dados recebidos:", dados);

    return res.status(200).json({ status: "success", message: "Cliente cadastrado com sucesso!" });
  }

  return res.status(405).json({ error: "Método não permitido" });
}


module.exports = (req, res) => {
  res.status(200).json({ message: "Dados do servidor" });
};
