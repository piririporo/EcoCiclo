export const hardwareCatalog = [
  {
    id: "motherboard",
    category: "Placas-mãe",
    name: "Placa-mãe",
    format: "Formato ATX",
    image: "motherboard",
    subtitle: "Onde tudo se conecta.",
    description:
      "A base que conecta processador, memória, armazenamento e placas de expansão.",
    parts: [
      "Soquete do processador",
      "Slots de memória DIMM",
      "Conectores PCI Express",
    ],
    check: "Confira o soquete, o formato do gabinete e a geração da memória.",
  },
  {
    id: "memory",
    category: "Memórias RAM",
    name: "Memória RAM",
    format: "Módulo DIMM",
    image: "memory",
    subtitle: "Espaço para cada tarefa.",
    description:
      "Chips de memória, contatos dourados e o encaixe que orienta a instalação no slot.",
    parts: ["Chips de memória", "Contatos de conexão", "Entalhe de orientação"],
    check: "Confira a geração DDR, a capacidade e o formato DIMM ou SODIMM.",
  },
  {
    id: "ssd",
    category: "Armazenamento",
    name: "SSD M.2",
    format: "Formato 2280",
    image: "ssd",
    subtitle: "Pequeno no tamanho. Ágil no uso.",
    description:
      "Uma placa compacta com controlador e chips de memória flash para armazenar seus arquivos.",
    parts: ["Memória NAND", "Controlador", "Conector M.2"],
    check:
      "Confira o comprimento, a chave do conector e a interface aceita pela placa-mãe.",
  },
  {
    id: "processor",
    category: "Processadores",
    name: "Processador",
    format: "Encapsulamento LGA",
    image: "processor",
    subtitle: "Cada instrução começa aqui.",
    description:
      "A tampa metálica distribui o calor. Na parte inferior, os contatos fazem a ligação com o soquete.",
    parts: ["Tampa metálica", "Substrato do processador", "Matriz de contatos"],
    check:
      "Confira o soquete, o suporte do BIOS e os requisitos de refrigeração.",
  },
  {
    id: "gpu",
    category: "Placas de vídeo",
    name: "Placa de vídeo",
    format: "Refrigeração dupla",
    image: "gpu",
    subtitle: "Dê forma às suas ideias.",
    description:
      "Duas ventoinhas, dissipador com aletas e conexão PCI Express em um conjunto dedicado aos gráficos.",
    parts: ["Ventoinhas", "Dissipador de calor", "Conector PCI Express"],
    check:
      "Confira as dimensões, a potência da fonte e os conectores de energia.",
  },
  {
    id: "notebook",
    category: "Notebooks",
    name: "Notebook",
    format: "Computador portátil",
    image: "notebook",
    subtitle: "Um novo ciclo pode ir com você.",
    description:
      "Explore a tela, o teclado, o trackpad e as conexões de um computador portátil.",
    parts: ["Tela e dobradiças", "Teclado e trackpad", "Conexões laterais"],
    check:
      "A possibilidade de trocar memória e armazenamento depende do modelo.",
  },
] as const;
export type HardwareId = (typeof hardwareCatalog)[number]["id"];
export function hardwareForCategory(category: string) {
  return (
    hardwareCatalog.find((item) => item.category === category) ??
    hardwareCatalog[0]
  );
}
