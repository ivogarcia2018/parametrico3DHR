import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Braces,
  CalendarDays,
  Check,
  ChevronDown,
  CircleCheck,
  Clock3,
  Eye,
  Library,
  MapPin,
  Menu,
  Minus,
  MousePointer2,
  Orbit,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Send,
  Terminal,
  UserCheck,
  Users,
  VolumeX,
  WandSparkles,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import GraphField from "../components/GraphField";

// O topo da página é um clipe, não um still: o poster cobre o primeiro frame
// enquanto o MP4 carrega. Para passar ao plano noturno basta apontar estas duas
// constantes a motion-pavilion.mp4 / motion-poster.webp.
const HERO_VIDEO = "/media/motion-context.mp4";
const HERO_POSTER = "/media/motion-context-poster.webp";

// Destino unico das inscricoes e dos pedidos de informacao. Nao ha backend de
// email: o formulario compoe uma mensagem enderecada a este endereco (mailto:)
// e o proprio endereco fica visivel no cartao de contacto e no rodape, para quem
// preferir escrever directamente.
const CONTACT_EMAIL = "formacao@3dhr.pt";

// As quatro imagens que sustentam a pagina. Nenhuma leva texto ou painel
// sobreposto: a legenda vive sempre abaixo da imagem.
const PRINCIPAL_IMAGES = [
  {
    src: "/media/hero-pavilion.webp",
    alt: "Pavilhão de madeira laminada curvada, construído e aberto ao público",
    index: "01",
    title: "Pavilhão construído",
    caption:
      "Estrutura em madeira laminada de cavelhas entrelaçadas, com núcleo central e base circular.",
    wide: true,
  },
  {
    src: "/media/curation-reference.jpg",
    alt: "Utilizadores sentados no banco de madeira sob o pavilhão",
    index: "02",
    title: "Uso e escala humana",
    caption:
      "O pavilhão como lugar de estar. A altura do banco e o vão livre são decididos pelo uso.",
    wide: false,
  },
  {
    src: "/media/anatomy-detail.png",
    alt: "Vista do núcleo estrutural do pavilhão, com nervuras a convergir na base",
    index: "03",
    title: "Núcleo estrutural",
    caption:
      "As costelas convergem num núcleo central sobre base circular. O desenho e a estrutura são o mesmo elemento.",
    wide: false,
  },
  {
    src: "/media/project-reference.jpg",
    alt: "Prancha técnica do pavilhão: estrutura, perspetiva do núcleo e vista geral com cotas",
    index: "04",
    title: "Prancha técnica",
    caption:
      "Estrutura, perspetiva do núcleo e vista geral com cotas, detalhes de material e componentes.",
    wide: true,
  },
] as const;

const stages = [
  {
    id: "curation",
    number: "01",
    eyebrow: "CURADORIA",
    title: "A informação deixa de ser opinião.",
    description:
      "Catálogos de contraplacado de bétula, limites de fresas CNC e fichas de material entram num caderno ancorado em fontes reais. Sai uma tabela de dados que podes citar — o oposto de uma resposta inventada.",
    tool: "NotebookLM",
    icon: Library,
    color: "#e96b3b",
    signal: "Fontes citadas · zero alucinação",
    detail: "PDFs oficiais → tabela factual",
    proof: "",
    input: "PDFs de catálogo",
    output: "tabela factual",
  },
  {
    id: "parameters",
    number: "02",
    eyebrow: "PARÂMETROS",
    title: "A intenção torna-se número.",
    description:
      "A ficha de requisitos é traduzida em relações matemáticas: diâmetro, altura, número de costelas, ângulo de abertura, folgas e tolerância de corte. O resultado é um parametros.json que editas sem tocar na geometria.",
    tool: "Gemini Pro",
    icon: Braces,
    color: "#f2b544",
    signal: "Parâmetros explícitos e editáveis",
    detail: "requisitos → parametros.json",
    proof: "/media/result-parametric.webp",
    input: "ficha de requisitos",
    output: "parametros.json",
  },
  {
    id: "geometry",
    number: "03",
    eyebrow: "GEOMETRIA",
    title: "A forma aprende a responder.",
    description:
      "Um agente ligado ao Rhino 8 por MCP escreve e corre código em quatro fases — espinha, costelas, encaixes, variantes — e cada fase espera pela tua aprovação antes de tocar no documento.",
    tool: "Cline + Rhino MCP",
    icon: Terminal,
    color: "#b6c9bb",
    signal: "Human-in-the-loop em cada comando",
    detail: "04 fases · sólidos fechados",
    proof: "/media/result-system.webp",
    input: "JSON + sessão 3D",
    output: "modelo .3dm",
  },
  {
    id: "image",
    number: "04",
    eyebrow: "IMAGEM",
    title: "A matéria ganha presença.",
    description:
      "Capturas clay do modelo alimentam uma renderização IA em image-to-image que respeita a forma construída: a mesma geometria, com luz, materialidade e escala humana.",
    tool: "Nano Banana 2",
    icon: WandSparkles,
    color: "#e96b3b",
    signal: "Fidelidade à silhueta construída",
    detail: "clay / AO → render 16:9",
    proof: "/media/result-night.webp",
    proofs: [
      "/media/result-night.webp",
      "/media/result-concept.webp",
      "/media/hero-pavilion.webp",
      "/media/result-execution.webp",
    ],
    input: "captura clay / AO",
    output: "imagem 16:9",
  },
  {
    id: "time",
    number: "05",
    eyebrow: "TEMPO",
    title: "A ideia ganha tempo.",
    description:
      "Das imagens estáticas escolhidas, o projeto passa a poder ser representado em animação.",
    tool: "Gemini Omni / Veo",
    icon: Orbit,
    color: "#f2b544",
    signal: "Estabilidade estrutural no plano",
    detail: "render → clipe 06—08 s",
    proof: "/media/motion-pavilion.mp4",
    proofPoster: "/media/motion-poster.webp",
    input: "render aprovado",
    output: "clipe MP4",
  },
] as const;

type StageId = (typeof stages)[number]["id"];

const faqs = [
  {
    question: "Quanto tempo dura e como está organizado?",
    answer:
      "Seis horas de relógio em duas sessões online ao vivo de três horas cada: 170 minutos de atividade efetiva e uma pausa de 10 minutos por sessão. A sessão 1 é curadoria e modelação agêntica; a sessão 2 é render, cinemática e apresentação.",
  },
  {
    question: "Quando acontece?",
    answer:
      "Terça-feira, 10 de novembro, e quinta-feira, 12 de novembro de 2026, das 18:30 às 21:30 (WET). São duas sessões online ao vivo de três horas cada, com gravação disponível por 30 dias.",
  },
  {
    question: "Preciso de saber programar?",
    answer:
      "Não. Escreves pouco código: o agente propõe, tu inspecionas e aprovas. O que interessa é leres a lógica — parâmetros, tolerâncias, encaixes — e decidires quando o resultado está bom.",
  },
  {
    question: "Que ferramentas vamos usar?",
    answer:
      "NotebookLM para curadoria ancorada em catálogos reais, Gemini Pro para traduzir requisitos em parâmetros, Cline no VS Code ligado ao Rhino 8 por MCP para modelar e documentar por código, Nano Banana 2 para render com fidelidade de silhueta e Gemini Omni / Veo para o clipe final.",
  },
  {
    question: "Isto é só gerar imagens bonitas com IA?",
    answer:
      "Não, e é aí que este workshop se distingue. A IA na arquitetura costuma falhar num de dois extremos: renders de conceito impossíveis de construir, ou scripts isolados que nunca chegam à apresentação. Aqui a IA atua sobre um modelo mensurável no Rhino — sólidos fechados, tolerância de 0,01 mm — e cada comando espera pela tua aprovação. A imagem vem no fim e respeita a silhueta construída.",
  },
  {
    question: "A IA decide por mim?",
    answer:
      "Não. A IA é a ferramenta; o critério continua a ser do arquiteto. O protocolo é sempre human-in-the-loop: o agente propõe, tu inspecionas e aprovas antes de qualquer alteração ao documento, com ponto de recuperação e versões v001 a v003. O workshop treina exatamente esse critério — decidir quando o resultado está bom.",
  },
  {
    question: "É preciso ter Rhino instalado?",
    answer:
      "Sim, Rhino 8 com tolerância do documento em milímetros. A versão de avaliação de 90 dias é suficiente para acompanhar o workshop e continuar a experimentar depois.",
  },
  {
    question: "Saio com um projeto final?",
    answer:
      "Sais com um pavilhão de leitura em estrutura waffle: modelo .3dm com sólidos fechados, script .py reutilizável, painel 16:9, clipe de 6 a 8 segundos, kit de prompts e um pitch de 3 minutos apresentado à turma.",
  },
  {
    question: "Quantas pessoas por turma?",
    answer:
      "Entre 12 e 15. É o limite que permite acompanhar cada modelo ao vivo durante as sessões e dar crítica individual no showcase final de cada formando.",
  },
  {
    question: "Quanto custa e o que está incluído?",
    answer:
      "Early bird: 100 € + IVA. Preço normal: 120 € + IVA. A inscrição inclui a gravação das duas sessões disponível por 30 dias, ficheiros de exercício, biblioteca de prompts, checklist de qualidade e certificado.",
  },
  {
    question: "Quem conduz o workshop?",
    answer:
      "O Arquiteto Ivo Garcia. É V-Ray Mentor da Chaos Group em Portugal, professor na Escola Superior de Artes e Design, pós-graduado em Arquitetura Digital e formador convidado da Ordem dos Arquitectos em Inteligência Artificial na Arquitetura. Como formador convidado da OA já correspondeu a este tema, e é ele quem define e responde pelo projeto de formação 3DHR Training.",
  },
];

// Credibilidade do formador.
//
// A ordem e' deliberada e nao cronologica: os titulos vao do mais escasso para
// o mais institucional. "V-Ray Mentor em Portugal" e' o primeiro porque e' o
// unico titulo que nem um concorrente com portfolio equivalente compra — e
// porque liga directamente ao tema do workshop (imagem e render). A OA vem a
// seguir porque valida a competencia profissional junto de quem assina a Ordem.
// O resto fecha a cadeia: ensino, formacao de base e o papel no 3DHR.
//
// `proof` e' a razao de existir de cada linha: o que o visitante ganha em
// confiarem. Sem ela, isto seria uma lista de Logros sem peso especifico.
const mentor = {
  name: "Ivo Garcia",
  role: "arquiteto · mentor do 3DHR training",
  lead:
    "Inteligência artificial é a ferramenta. O que faz o resultado valer é o critério de quem projeta — e o critério vem da arquitetura. Por isso o 3DHR Training é conduzido por um arquiteto que ensina arquitetura e põe a IA ao serviço dela.",
  photo: {
    src: "/media/mentor-ivo-garcia.webp",
    srcSm: "/media/mentor-ivo-garcia-sm.webp",
    // 760x956 = 4:5, gerado por client/scripts/brand/make_mentor_photo.py.
    width: 760,
    height: 956,
    alt: "Arquiteto Ivo Garcia, formador do 3DHR Training",
    caption:
      "Arquiteto, formador de IA na Ordem dos Arquitectos e V-Ray Mentor da Chaos Group em Portugal.",
  },
  credentials: [
    {
      label: "chaos group",
      value: "V-Ray Mentor em Portugal",
      proof: "Titulação do fabricante da ferramenta de referência em archviz. O título que vem com o nome do produto.",
    },
    {
      label: "ordem dos arquitectos",
      value: "Formador convidado",
      proof: "Convidado a ministrar Inteligência Artificial na Arquitetura. Validação de competência por entidade que regula a profissão.",
    },
    {
      label: "ensino",
      value: "ESAD · professor",
      proof: "Docente na Escola Superior de Artes e Design. Método de ensino validado todos os semestres, não só neste workshop.",
    },
    {
      label: "formacao",
      value: "Pós-graduação em Arquitetura Digital",
      proof: "Base técnica na área onde a IA entra — a mesma que lê da modelação à imagem.",
    },
    {
      label: "especialidade",
      value: "ArchVIZ · VR · video e imagem",
      proof: "O percurso completo do desenho construído até à imagem final, que é o que este workshop acrescenta.",
    },
    {
      label: "no 3dhr",
      value: "Mentor e responsável pelo projeto",
      proof: "Não é um formador convidado a mais: é quem responde pela qualidade do que é ensinado aqui.",
    },
  ],
} as const;

const programItems = [
  {
    day: "SESSÃO 01",
    title: "curadoria & modelação agêntica",
    text: "Dados técnicos ancorados, parâmetros explícitos e a primeira versão do modelo escrita por agente sob supervisão.",
    icon: Library,
    tag: "ter 10 nov · 3 h",
    duration: "18:30—21:30 WET",
    tools: "NotebookLM · Gemini Pro · Cline + Rhino MCP",
    toolMark: "NL",
    toolName: "NotebookLM",
    output: "4 fases · sólidos fechados",
    pause: "intervalo de 10 min",
    pauseAt: "19:45—19:55",
    pauseAfter: "1.2",
    details:
      "A sessão começa nos dados e termina em geometria válida: catálogos lidos com citação, requisitos convertidos em números e quatro fases de modelação aprovadas uma a uma por ti.",
    blocks: [
      { id: "1.1", title: "Especificação e dados", minutes: "40 min", text: "Leitura cruzada dos catálogos técnicos no NotebookLM e extração do bloco numérico em JSON.", deliverable: "parametros.json validado" },
      { id: "1.2", title: "Ambiente agêntico e MCP", minutes: "35 min", text: "Ligação do VS Code (Cline) ao Rhino 8, verificação das unidades e da tolerância de 0,01 mm, ponto de recuperação do documento.", deliverable: "teste de MCP aprovado" },
      { id: "1.3", title: "Modelação paramétrica em 4 fases", minutes: "95 min", text: "Espinha helicoidal → 24 costelas radiais → encaixes waffle com folga → variação individual dos parâmetros.", deliverable: ".3dm com sólidos fechados" },
    ],
  },
  {
    day: "SESSÃO 02",
    title: "visualização, cinemática & pitch",
    text: "Do modelo validado ao painel de apresentação: render com fidelidade de silhueta, clipe contínuo e defesa do projeto.",
    icon: Play,
    tag: "qui 12 nov · 3 h",
    duration: "18:30—21:30 WET",
    tools: "Nano Banana 2 · Gemini Omni / Veo",
    toolMark: "NB",
    toolName: "Nano Banana 2",
    output: "painel 16:9 · pitch 3 min",
    pause: "intervalo de 10 min",
    pauseAt: "20:00—20:10",
    pauseAfter: "2.2",
    details:
      "A sessão transforma geometria em comunicação: capturas com rigor, imagem fotorreal que não inventa estrutura e um plano de vídeo estável, terminando no showcase individual de três minutos.",
    blocks: [
      { id: "2.1", title: "Render com fidelidade estrita", minutes: "45 min", text: "Capturas clay no Rhino e renderização image-to-image que preserva a geometria estrutural construída.", deliverable: "2 capturas + 1 render aprovado" },
      { id: "2.2", title: "Cinemática espacial", minutes: "45 min", text: "Planos contínuos de 6 a 8 segundos — dolly-in ou órbita suave — com as ripas de bétula estáveis.", deliverable: "clipe MP4 sem distorções" },
      { id: "2.3", title: "Painel e montagem", minutes: "40 min", text: "Composição do painel 16:9 com plantas, secções, render e clipe, e ensaio do pitch de 3 minutos.", deliverable: "painel 16:9" },
      { id: "2.4", title: "Showcase e crítica", minutes: "40 min", text: "Apresentação individual perante a turma e plano para reaplicar o pipeline num projeto do atelier.", deliverable: "pitch de 3 min" },
    ],
  },
] as const;

type FormField = "name" | "email" | "profile" | "message";
type FormValues = Record<FormField, string>;
type FormErrors = Partial<Record<FormField, string>>;

function validateField(field: FormField, value: string) {
  const cleanValue = value.trim();
  if (field === "name" && cleanValue.length < 2) return "Indica pelo menos 2 caracteres.";
  if (field === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanValue)) return "Escreve um email válido.";
  if (field === "profile" && !cleanValue) return "Escolhe uma opção.";
  if (field === "message" && cleanValue.length > 0 && cleanValue.length < 8) return "Escreve pelo menos 8 caracteres ou deixa vazio.";
  return "";
}

// Texto legivel de cada opcao do seletor de perfil, para entrar no corpo do
// email com o mesmo sentido que o visitante escolheu no formulario.
const PROFILE_LABELS: Record<string, string> = {
  arquitetura: "sou arquiteto/a",
  estudante: "sou estudante",
  equipa: "represento uma equipa",
  outro: "outro perfil",
};

// Compõe o `mailto:` com o pedido já preenchido: o assunto identifica a origem
// (inscrição / informação) e o corpo repete os campos submetidos, para o email
// chegar a formacao@3dhr.pt sem passos intermédios.
function buildMailtoLink(values: FormValues) {
  const profile = PROFILE_LABELS[values.profile] ?? values.profile;
  const subject = `Inscrição / pedido de informação — ${values.name}`;
  const body = [
    `Nome: ${values.name}`,
    `Email: ${values.email}`,
    `Perfil: ${profile}`,
    `Mensagem: ${values.message.trim() || "—"}`,
  ].join("\r\n");
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

// Logotipo oficial 3DHR Training. O lockup (vidro "3DHR" + barra laranja
// "TRAINING") e' gerado por client/scripts/brand/make_lockup.py, que junta a
// marca de vidro extraida de logo.jpg pela make_logo_assets.py com a barra.
//
// Proporcao 5,10:1 — bem mais largo do que a wordmark sozinha (2,67:1).
// Por isso a altura e' o unico eixo de dimensionamento e a largura sai da
// proporcao do PNG: dimensionar pela largura rebentaria a barra de navegacao.
//
// srcset: o "-sm" (400 px) cobre o header e o rodape, onde o logo ocupa
// ~22—38 px de altura; o master (1200 px) serve contextos maiores sem ficar
// pixellizado.
//
// A altura vai por custom property, e nao por `style={{ height }}`, para o CSS
// poder encolher o logo entre 768 e 1023 px: a razao 5,10:1 torna a largura o
// gargalo nessa faixa, onde os links de navegacao ja disputam o mesmo espaco.
const BRAND_RATIO = 5.101;

function BrandMark({ height = 26, className = "" }: { height?: number; className?: string }) {
  return (
    <img
      src="/media/logo-3dhr-training.png"
      srcSet="/media/logo-3dhr-training-sm.png 400w, /media/logo-3dhr-training.png 1200w"
      sizes="(max-width: 768px) 112px, (max-width: 1023px) 112px, 150px"
      alt="3DHR Training"
      width={Math.round(height * BRAND_RATIO)}
      height={height}
      style={{ "--brand-h": `${height}px` } as CSSProperties}
      className={`brand-logo ${className}`}
    />
  );
}

export default function Home() {
  const [selectedStage, setSelectedStage] = useState<StageId>("curation");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [formValues, setFormValues] = useState<FormValues>({ name: "", email: "", profile: "arquitetura", message: "" });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [formOutcome, setFormOutcome] = useState<"sent" | "prepared" | null>(null);
  const [formSending, setFormSending] = useState(false);
  const [expandedProgram, setExpandedProgram] = useState(0);
  // Rotação das imagens 3D na evidência do estágio IMAGEM (04).
  const [proofIndex, setProofIndex] = useState(0);

  // Arrasto do cartão de contacto: o utilizador reposiciona a caixa
  // sem que ela volte a tapar as letras do titulo.
  const [cardOffset, setCardOffset] = useState({ x: 0, y: 0 });
  const [cardDragging, setCardDragging] = useState(false);
  const dragOrigin = useRef({ pointerX: 0, pointerY: 0, x: 0, y: 0 });
  const cardStageRef = useRef<HTMLDivElement>(null);

  function clampCardOffset(x: number, y: number) {
    const stage = cardStageRef.current;
    if (!stage) return { x, y };
    const bounds = stage.getBoundingClientRect();
    const limitX = Math.max(0, (bounds.width - 320) / 2);
    const limitY = Math.max(0, bounds.height - 120);
    return {
      x: Math.min(limitX, Math.max(-limitX, x)),
      y: Math.min(limitY, Math.max(-limitY, y)),
    };
  }

  function handleCardPointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    dragOrigin.current = { pointerX: event.clientX, pointerY: event.clientY, x: cardOffset.x, y: cardOffset.y };
    setCardDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleCardPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!cardDragging) return;
    const dx = event.clientX - dragOrigin.current.pointerX;
    const dy = event.clientY - dragOrigin.current.pointerY;
    setCardOffset(clampCardOffset(dragOrigin.current.x + dx, dragOrigin.current.y + dy));
  }

  function endCardDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    setCardDragging(false);
  }

  function handleCardKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    const step = event.shiftKey ? 32 : 12;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    setCardOffset((prev) => clampCardOffset(prev.x + move[0], prev.y + move[1]));
  }

  const activeStage = stages.find((stage) => stage.id === selectedStage) ?? stages[0];
  const ActiveIcon = activeStage.icon;

  // Imagens 3D a rodar na evidência: só o estágio IMAGEM define `proofs`.
  const stageProofs = "proofs" in activeStage ? (activeStage.proofs as readonly string[]) : null;
  const stageProof = stageProofs ? stageProofs[proofIndex % stageProofs.length] : activeStage.proof;

  // Avança a rotação de 4 em 4 s; recomeça do zero ao mudar de estágio.
  useEffect(() => {
    setProofIndex(0);
  }, [activeStage.id]);

  useEffect(() => {
    if (!stageProofs || stageProofs.length < 2) return;
    const interval = window.setInterval(() => {
      setProofIndex((current) => (current + 1) % stageProofs.length);
    }, 4000);
    return () => window.clearInterval(interval);
  }, [activeStage.id, stageProofs?.length]);

  function handleFieldChange(field: FormField, value: string) {
    setFormValues((current) => ({ ...current, [field]: value }));
    const error = validateField(field, value);
    setFormErrors((current) => {
      const next = { ...current };
      if (error) next[field] = error;
      else delete next[field];
      return next;
    });
    setFormOutcome(null);
  }

  // Recuo: abre o cliente de email do visitante com o pedido já escrito. Usa-se
  // quando o servidor não tem SMTP configurado, quando o envio falha e também em
  // `pnpm dev`, onde só corre o Vite e não existe `/api/pedido`.
  function openMailtoFallback(sendFailed: boolean) {
    window.location.href = buildMailtoLink(formValues);
    setFormOutcome("prepared");
    // Aviso, nao sucesso: aqui o servidor nao enviou nada — quem tem de enviar
    // e o visitante. Um toast verde fazia crer que o pedido ja tinha saido.
    toast.warning(sendFailed ? "O envio directo falhou." : "Falta configurar o envio de email.", {
      description: `Abrimos o teu email com o pedido endereçado a ${CONTACT_EMAIL} — confirma o envio.`,
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: FormErrors = {};
    (Object.keys(formValues) as FormField[]).forEach((field) => {
      const error = validateField(field, formValues[field]);
      if (error) nextErrors[field] = error;
    });
    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setFormOutcome(null);
      toast.error("Revê os campos assinalados.", { description: "Falta uma pequena correção antes de enviar." });
      return;
    }

    // O pedido segue por POST para `server/index.ts`, que o envia por SMTP para
    // formacao@3dhr.pt. Se a resposta não for JSON (Vite em `pnpm dev`, ou site
    // servido como estático) o formulário recua para o `mailto:`.
    setFormSending(true);
    try {
      const response = await fetch("/api/pedido", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formValues),
        // Se o SMTP estiver lento o visitante nao fica preso à espera: ao fim
        // de 20 s caimos no recuo do `mailto:`.
        signal: AbortSignal.timeout(20_000),
      });
      const isJson = (response.headers.get("content-type") ?? "").includes("application/json");
      const payload: { ok?: boolean; reason?: string } | null = isJson
        ? await response.json().catch(() => null)
        : null;

      if (response.ok && payload?.ok) {
        setFormOutcome("sent");
        toast.success("Pedido enviado.", {
          description: `Recebemos o teu pedido. Respondemos para ${formValues.email} em 24h úteis.`,
        });
        return;
      }

      openMailtoFallback(payload?.reason === "send-failed");
    } catch {
      openMailtoFallback(true);
    } finally {
      setFormSending(false);
    }
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f2efe6] text-[#171715] selection:bg-[#e96b3b] selection:text-[#171715]">
      <GraphField />

      <div className="noise pointer-events-none fixed inset-0 z-50 opacity-[0.035]" />

      {/* Em ecrãs estreitos a barra de topo ocupa 2—3 linhas: o header vive
          dentro desta caixa e é posicionado a `top-full`, por isso acompanha
          sempre a altura real da barra em vez de assumir uma altura fixa. */}
      <div className="relative z-40">
        <div className="bg-[#171715] px-4 py-2 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-[#f2efe6] sm:text-[11px]">
          <span className="mr-2 text-[#e96b3b]">●</span> workshop online ao vivo · 2 sessões de 3 h · 10 e 12 novembro 2026 · 12 a 15 lugares
        </div>

        <header className="absolute left-0 right-0 top-full px-4 py-5 sm:px-8 lg:px-12">
        <nav className="mx-auto flex max-w-[1400px] items-center justify-between">
          <a href="#top" className="group flex items-center gap-3" aria-label="3DHR Training, início">
            <BrandMark height={26} />
            {/* O lockup ja diz "3DHR Training" na barra laranja, por isso nao
                se repete o nome em texto. O nome completo esta no aria-label
                do link, no titulo e nas meta tags og. A altura baixa (26 px)
                compensa a razao 5,1:1, que daria ~173 px de largura aqui. */}
          </a>

          <div className="hidden items-center gap-8 md:flex">
            <a href="#impasse" className="nav-link">Porquê</a>
            <a href="#processo" className="nav-link">O processo</a>
            <a href="#programa" className="nav-link">Programa</a>
            <a href="#faq" className="nav-link">FAQ</a>
            <button type="button" onClick={() => scrollToId("inscricao")} className="button-outline-light">
              Reservar lugar <ArrowUpRight size={14} />
            </button>
          </div>

          <button
            type="button"
            className="grid h-10 w-10 place-items-center border border-[#f2efe6]/40 text-[#f2efe6] md:hidden"
            onClick={() => setMobileOpen((open) => !open)}
            aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </nav>

        {mobileOpen && (
          <div data-copy-transient className="mx-auto mt-4 max-w-[1400px] border border-[#f2efe6]/20 bg-[#171715]/95 p-5 backdrop-blur-xl md:hidden">
            <div className="flex flex-col gap-4 font-mono text-[11px] uppercase tracking-[0.14em] text-[#f2efe6]">
              <a href="#impasse" onClick={() => setMobileOpen(false)}>Porquê</a>
              <a href="#processo" onClick={() => setMobileOpen(false)}>O processo</a>
              <a href="#programa" onClick={() => setMobileOpen(false)}>Programa</a>
              <a href="#faq" onClick={() => setMobileOpen(false)}>FAQ</a>
              <button type="button" onClick={() => { setMobileOpen(false); scrollToId("inscricao"); }} className="button-primary mt-2 justify-center">
                Reservar lugar <ArrowUpRight size={14} />
              </button>
            </div>
          </div>
        )}
        </header>
      </div>

      <main>
        {/* Sem `isolate`: a secao nao cria contexto de empilhamento, para o
            contentor de texto (`.field-content`, z-30) conseguir subir acima
            da folha de fundo (z-20). Com `isolate`, o texto ficava preso
            abaixo dela e a folha desenhava-se por cima do titulo.

            O video e o veu de contraste tambem sobem a z-30: o clipe e uma
            imagem, nao um fundo chapado — um traço de caderno por cima de uma
            fotografia le-se como defeito, nao como pano. Como esta secao nao
            cria contexto, os tres blocos com o mesmo z-index resolvem-se pela
            ordem do DOM: figura, veu, texto. A folha em z-20 fica entao
            visivel apenas nas areas de fundo chapado, que e' onde ela deve
            aparecer. */}
        <section
          id="top"
          className="relative bg-[#1a1916] text-[#f2efe6]"
        >
          <figure className="relative z-30 w-full overflow-hidden bg-[#1a1916]">
            <video
              src={HERO_VIDEO}
              poster={HERO_POSTER}
              className="block h-[62vh] min-h-[400px] w-full object-cover"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              aria-label="Pavilhão de madeira laminado curvado, construído e aberto ao público — plano em movimento no parque"
            />
            <span className="pointer-events-none absolute bottom-5 right-5 flex items-center gap-2 border border-[#f2efe6]/25 bg-[#171715]/60 px-3 py-2 font-mono text-[9px] uppercase tracking-[0.13em] text-[#f2efe6]/75 backdrop-blur-md">
              <VolumeX size={13} /> clipe do pavilhão · sem som
            </span>
          </figure>
          {/* Véu de contraste: o clipe do topo é claro e mexido, e sem isto a
              navegação em creme (10 px) perde legibilidade sobre a imagem. */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-30 h-52 bg-gradient-to-b from-[#171715]/90 via-[#171715]/40 to-transparent" />
          <div className="field-content relative mx-auto flex max-w-[1400px] flex-col justify-end px-4 pb-14 pt-12 sm:px-8 sm:pb-20 lg:px-12">
            <div className="max-w-4xl">
              <div className="mb-7 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[#b6c9bb] sm:text-[11px]">
                <span className="h-px w-8 bg-[#e96b3b]" />
                arquitetura + inteligência artificial
              </div>
              <h1 className="font-display max-w-4xl text-[clamp(3rem,10vw,9rem)] font-black uppercase leading-[0.82] tracking-[-0.075em] text-[#f2efe6]">
                dá forma
                <br />
                <span className="text-[#e96b3b]">ao que</span>
                <br />
                ainda não existe.
              </h1>
              <div className="mt-8 flex max-w-xl flex-col gap-7 sm:flex-row sm:items-end sm:gap-10">
                <p className="max-w-sm text-sm leading-relaxed text-[#f2efe6]/70 sm:text-base">
                  Seis horas para ligar a IA ao que a arquitetura exige: curadoria ancorada, modelação agêntica no Rhino, render de silhueta fiel e clipe final — sempre sobre geometria mensurável e sob o teu controlo.
                </p>
                <button type="button" onClick={() => scrollToId("processo")} className="group flex w-fit items-center gap-3 font-mono text-[11px] uppercase tracking-[0.16em] text-[#f2efe6]">
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-[#e96b3b] text-[#171715] transition-transform duration-200 group-hover:translate-x-1 group-active:scale-95"><ArrowDown size={17} /></span>
                  ver como funciona
                </button>
              </div>
            </div>

            <div className="mt-16 grid max-w-2xl grid-cols-2 gap-5 border-t border-[#f2efe6]/20 pt-5 sm:grid-cols-4 sm:gap-8">
              <div><p className="stat-value">06</p><p className="stat-label">horas de imersão</p></div>
              <div><p className="stat-value">05</p><p className="stat-label">ferramentas em cadeia</p></div>
              <div><p className="stat-value">01</p><p className="stat-label">pavilhão de estudo</p></div>
              <div><p className="stat-value text-[#e96b3b]">∞</p><p className="stat-label">variantes tuas</p></div>
            </div>

            <p className="mt-8 max-w-[190px] font-mono text-[9px] uppercase leading-relaxed tracking-[0.15em] text-[#f2efe6]/45">
              <span className="mb-2 block text-[#e96b3b]">/ 38.7223° N</span>
              pensar é desenhar uma<br /> hipótese de futuro.
            </p>
          </div>
        </section>

        <div className="overflow-hidden border-b border-[#171715]/15 bg-[#e96b3b] py-3">
          <div className="marquee-track field-content flex min-w-max items-center gap-8 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#171715]">
            <span>da curadoria ao clipe final</span><span>✳</span><span>human-in-the-loop</span><span>✳</span><span>estrutura waffle em bétula</span><span>✳</span><span>da curadoria ao clipe final</span><span>✳</span><span>human-in-the-loop</span><span>✳</span><span>estrutura waffle em bétula</span><span>✳</span><span>da curadoria ao clipe final</span><span>✳</span><span>human-in-the-loop</span><span>✳</span><span>estrutura waffle em bétula</span><span>✳</span>
          </div>
        </div>

        <section id="galeria" className="scroll-mt-10 bg-[#171715] px-4 py-20 sm:px-8 sm:py-24 lg:px-12">
          <div className="field-content relative mx-auto max-w-[1400px]">
            <div className="mb-12 flex flex-col gap-4 sm:mb-16 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="font-display max-w-2xl text-[clamp(2.2rem,6vw,4.6rem)] font-black uppercase leading-[0.86] tracking-[-0.06em] text-[#f2efe6]">
                o pavilhão,
                <br />
                <span className="text-[#e96b3b]">a prova</span>
              </h2>
              <p className="max-w-sm text-sm leading-relaxed text-[#f2efe6]/60">
                Quatro imagens definem o trabalho: o pavilhão construído, o seu uso, o
                núcleo estrutural e a prancha técnica que o coordena.
              </p>
            </div>

            <div className="grid gap-8 sm:gap-10 lg:grid-cols-2 lg:gap-12">
              {PRINCIPAL_IMAGES.map((image) => (
                <figure
                  key={image.src}
                  className={`flex flex-col ${
                    image.wide ? "lg:col-span-2" : ""
                  }`}
                >
                  <img
                    src={image.src}
                    alt={image.alt}
                    loading="lazy"
                    className={`w-full bg-[#0e0e0c] ${
                      image.wide
                        ? "max-h-[78vh] object-cover"
                        : "aspect-[4/3] object-cover"
                    }`}
                  />
                  <figcaption className="mt-4 flex gap-4 border-t border-[#f2efe6]/20 pt-4">
                    <span className="font-mono text-[10px] tracking-[0.14em] text-[#e96b3b]">
                      {image.index}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-display text-xl font-bold uppercase tracking-[-0.03em] text-[#f2efe6]">
                        {image.title}
                      </span>
                      <span className="mt-2 block max-w-2xl text-sm leading-relaxed text-[#f2efe6]/60">
                        {image.caption}
                      </span>
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* A tese da pagina: o impasse da IA na arquitetura e a ancora que o
            resolve. Fica entre a prova (a galeria) e o metodo (o processo),
            porque o "porque" tem de vir antes do "como".

            E' a unica seccao que argumenta em vez de mostrar, por isso troca a
            prova visual por contraste tipografico: o impasse a escuro-sobre-claro,
            a resposta a claro-sobre-escuro. Reutiliza classes ja existentes
            (.section-kicker, .title-fit, .flow-chip) para nao introduzir CSS novo. */}
        <section id="impasse" className="scroll-mt-10 bg-[#ddd7c7] px-4 py-24 sm:px-8 sm:py-32 lg:px-12">
          <div className="field-content relative mx-auto max-w-[1400px]">
            <div className="mb-16 grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-end">
              <div className="title-col">
                <p className="section-kicker">01 / o porquê</p>
                <h2 className="font-display title-fit title-fit-tight mt-5 font-black uppercase leading-[0.9] tracking-[-0.06em]">
                  sem âncora,<br /><span className="text-[#e96b3b]">não há arquitetura.</span>
                </h2>
              </div>
              <div className="flex max-w-xl flex-col gap-5 lg:pb-1">
                <p className="text-lg leading-relaxed text-[#171715]/75 sm:text-xl">
                  A IA na arquitetura oscila entre dois extremos que não servem: imagens de conceito impressionantes mas <em className="font-display font-bold">impossíveis de construir</em> — sem física nem juntas — e scripts de automação isolados, desligados da apresentação do atelier. Falta-lhes uma âncora comum.
                </p>
                <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#171715]/50"><span className="h-px w-8 bg-[#171715]/30" /> o problema · a resposta · o ganho</div>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="border border-[#171715]/20 bg-[#171715]/[0.04] p-6 sm:p-7">
                <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[#171715]/55"><X size={14} /> o impasse</div>
                <p className="mt-4 max-w-md font-display text-xl font-bold uppercase leading-[0.95] tracking-[-0.03em] sm:text-2xl">bonito e irrealizável, ou útil e invisível.</p>
                <ul className="mt-6 space-y-3.5 border-t border-[#171715]/15 pt-5">
                  <li className="flex flex-col gap-1">
                    <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#e96b3b]">extremo 01</span>
                    <span className="text-sm leading-relaxed text-[#171715]/70">Render de conceito que não se constrói — alucinação espacial, sem física nem juntas.</span>
                  </li>
                  <li className="flex flex-col gap-1">
                    <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#e96b3b]">extremo 02</span>
                    <span className="text-sm leading-relaxed text-[#171715]/70">Script de automação que não se apresenta — isolado da imagem e do concurso.</span>
                  </li>
                </ul>
              </div>

              <div className="border border-[#171715] bg-[#171715] p-6 text-[#f2efe6] sm:p-7">
                <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[#b6c9bb]"><CircleCheck size={14} className="icon-pulse" /> a resposta</div>
                <p className="mt-4 max-w-md font-display text-xl font-bold uppercase leading-[0.95] tracking-[-0.03em] sm:text-2xl">o modelo no rhino é a única fonte de verdade.</p>
                <p className="mt-5 max-w-md text-sm leading-relaxed text-[#f2efe6]/70">
                  A IA não substitui a modelação: entra <em>sobre</em> um modelo mensurável, escreve o código e espera pela tua inspeção antes de tocar no documento. Primeiro arquitetura verificável; a imagem vem depois, fiel ao que se construiu.
                </p>
                <ul className="mt-6 space-y-2 border-t border-[#f2efe6]/15 pt-5 font-mono text-[9px] uppercase tracking-[0.12em] text-[#f2efe6]/60">
                  <li className="flex items-center gap-2"><Check size={12} className="text-[#e96b3b]" /> human-in-the-loop em cada comando</li>
                  <li className="flex items-center gap-2"><Check size={12} className="text-[#e96b3b]" /> sólidos fechados · tolerância 0,01 mm</li>
                  <li className="flex items-center gap-2"><Check size={12} className="text-[#e96b3b]" /> render fiel à silhueta construída</li>
                </ul>
              </div>
            </div>

            <figure className="mt-6 border-l-4 border-[#e96b3b] bg-[#171715]/[0.04] p-6 sm:p-7">
              <blockquote className="max-w-3xl font-display text-xl font-bold leading-snug tracking-[-0.02em] text-[#171715]/85 sm:text-2xl">
                “Como passar de uma intenção espacial para um modelo rigorosamente mensurável — e dele para uma narrativa visual fotorrealista — sem largar o controlo autoral e geométrico?”
              </blockquote>
              <figcaption className="mt-3 font-mono text-[9px] uppercase tracking-[0.14em] text-[#171715]/50">a pergunta que organiza as seis horas</figcaption>
            </figure>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              <div className="flow-chip"><span>01 / velocidade com rigor</span><strong>dias em horas</strong></div>
              <div className="flow-chip"><span>02 / variantes a custo zero</span><strong>três leituras, não uma</strong></div>
              <div className="flow-chip"><span>03 / do conceito ao concurso</span><strong>modelo · painel · clipe</strong></div>
            </div>
          </div>
        </section>

        <section id="processo" className="scroll-mt-10 bg-[#f2efe6] px-4 py-24 sm:px-8 sm:py-32 lg:px-12">
          <div className="field-content relative mx-auto max-w-[1400px]">
            <div className="mb-16 grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-end">
              <div className="title-col">
                <p className="section-kicker">02 / o método</p>
                <h2 className="font-display title-fit title-fit-tight mt-5 font-black uppercase leading-[0.9] tracking-[-0.06em]">
                  uma ideia<br /><span className="text-[#e96b3b]">em movimento.</span>
                </h2>
              </div>
              <div className="flex max-w-xl flex-col gap-5 lg:pb-1">
                <p className="text-lg leading-relaxed text-[#171715]/75 sm:text-xl">
                  Não é uma aula sobre ferramentas. É uma experiência sobre como encadeá-las <em className="font-display font-bold">sobre uma âncora de verdade</em> — e quando intervir para que o resultado continue a ser teu.
                </p>
                <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#171715]/50"><span className="h-px w-8 bg-[#171715]/30" /> 05 momentos · 01 sistema de decisão</div>
              </div>
            </div>

            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
              <div className="space-y-2">
                {stages.map((stage, index) => {
                  const Icon = stage.icon;
                  const isActive = stage.id === selectedStage;
                  return (
                    <button
                      type="button"
                      key={stage.id}
                      onClick={() => setSelectedStage(stage.id)}
                      className={`stage-selector group w-full text-left ${isActive ? "stage-selector-active" : ""}`}
                    >
                      <span className="flex items-center gap-4">
                        <span className="font-mono text-[10px] text-[#171715]/45">{stage.number}</span>
                        <span className="grid h-10 w-10 place-items-center border border-[#171715]/20 transition-colors group-hover:border-[#e96b3b] group-hover:text-[#e96b3b]" style={isActive ? { color: stage.color, borderColor: stage.color } : undefined}><Icon size={17} strokeWidth={1.6} className="icon-active" /></span>
                        <span className="min-w-0 flex-1"><span className="block font-display text-[clamp(1.125rem,5.6vw,1.5rem)] font-bold uppercase tracking-[-0.03em] sm:text-2xl">{stage.eyebrow}</span><span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.12em] text-[#171715]/45">{stage.tool}</span></span>
                        <ArrowRight className="transition-transform duration-200 group-hover:translate-x-1" size={17} />
                      </span>
                    </button>
                  );
                })}
                <div className="mt-7 flex items-center gap-3 border-t border-[#171715]/10 pt-6 font-mono text-[10px] uppercase tracking-[0.13em] text-[#171715]/50"><MousePointer2 size={14} /> clica para explorar o sistema</div>
              </div>

              <div className="relative min-h-[430px] overflow-hidden border border-[#171715]/15 bg-[#171715] p-5 text-[#f2efe6] sm:p-7">
                <div className="absolute inset-0 blueprint-grid opacity-15" />
                <div className="absolute right-6 top-6 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.14em] text-[#b6c9bb]"><span className="h-2 w-2 rounded-full bg-[#b6c9bb]" /> live system</div>
                <div className="relative flex h-full min-h-[380px] flex-col justify-between">
                  <div className="flex items-start justify-between gap-6">
                    <div className="min-w-0"><p className="font-mono text-[10px] uppercase tracking-[0.17em]" style={{ color: activeStage.color }}>{activeStage.number} / {activeStage.eyebrow}</p><h3 className="font-display mt-4 min-w-0 max-w-md text-3xl font-bold uppercase leading-[0.9] tracking-[-0.05em] sm:text-5xl">{activeStage.title}</h3></div>
                    <div className="grid h-12 w-12 shrink-0 place-items-center border border-[#f2efe6]/20" style={{ color: activeStage.color }}><ActiveIcon size={23} strokeWidth={1.5} className="icon-active" /></div>
                  </div>

                  <div className="grid gap-7 sm:grid-cols-[1fr_0.85fr] sm:items-end">
                    <div>
                      <p className="max-w-md text-sm leading-relaxed text-[#f2efe6]/65">{activeStage.description}</p>
                      <div className="mt-6 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.11em]" style={{ color: activeStage.color }}><CircleCheck size={14} className="icon-pulse" /> {activeStage.signal}</div>
                      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[9px] uppercase tracking-[0.12em] text-[#f2efe6]/45">
                        <span>entrada / {activeStage.input}</span>
                        <span>saída / {activeStage.output}</span>
                      </div>
                    </div>
                    <figure className="flex flex-col">
                      <div className="relative aspect-square overflow-hidden border border-[#f2efe6]/20 bg-[#f2efe6]/[0.03]">
                        {stageProof ? (
                          stageProof.endsWith(".mp4") ? (
                            <video
                              key={activeStage.id}
                              src={stageProof}
                              poster={"proofPoster" in activeStage ? (activeStage.proofPoster as string) : undefined}
                              className="h-full w-full object-cover"
                              autoPlay
                              muted
                              loop
                              playsInline
                              preload="metadata"
                              aria-label={`${activeStage.eyebrow} — evidência do processo em vídeo`}
                            />
                          ) : (
                            <img key={`${activeStage.id}-${proofIndex}`} src={stageProof} alt={`${activeStage.eyebrow} — evidência do processo`} className="carousel-image h-full w-full object-cover" />
                          )
                        ) : (
                          <>
                            <div className="absolute inset-5 border border-dashed" style={{ borderColor: `${activeStage.color}70` }} />
                            <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rotate-45 border" style={{ borderColor: activeStage.color, boxShadow: `0 0 40px ${activeStage.color}30` }} />
                            <div className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 border bg-[#171715]" style={{ borderColor: activeStage.color }} />
                            <span className="absolute bottom-3 left-3 font-mono text-[8px] uppercase tracking-[0.12em] text-[#f2efe6]/45">{activeStage.detail}</span>
                            <span className="absolute right-3 top-3 font-mono text-[8px] uppercase tracking-[0.12em]" style={{ color: activeStage.color }}>x / y / z</span>
                          </>
                        )}
                      </div>
                      <figcaption className="mt-3 flex items-center justify-between gap-3 border-t border-[#f2efe6]/20 pt-2.5 font-mono text-[8px] uppercase tracking-[0.12em]">
                        <span style={{ color: activeStage.color }}>evidência / {activeStage.number}</span>
                        <span className="text-[#f2efe6]/55">{activeStage.detail}</span>
                      </figcaption>
                    </figure>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="programa" className="scroll-mt-10 bg-[#b6c9bb] px-4 py-24 sm:px-8 sm:py-32 lg:px-12">
          <div className="field-content relative mx-auto max-w-[1400px]">
            <div className="flex flex-col justify-between gap-8 border-b border-[#171715]/20 pb-8 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1"><div className="title-col"><p className="section-kicker">03 / o programa</p><h2 className="font-display title-fit mt-5 max-w-2xl font-black uppercase leading-[0.88] tracking-[-0.06em]">duas sessões para<br /><span className="text-[#e96b3b]">fechar o ciclo.</span></h2></div></div>
              <p className="max-w-xs text-sm leading-relaxed text-[#171715]/70">Cada sessão tem 170 minutos de atividade efetiva, organizados bloco a bloco, com um entregável concreto no fim de cada um.</p>
            </div>

            <div className="mt-10 border-y border-[#171715]/20">
              {programItems.map((item, index) => {
                const Icon = item.icon;
                const isOpen = expandedProgram === index;
                return <div key={item.day} className={`schedule-row ${isOpen ? "schedule-row-open" : ""}`}>
                  <button type="button" onClick={() => setExpandedProgram(isOpen ? -1 : index)} className="group flex w-full items-center gap-4 py-6 text-left sm:gap-6">
                    <span className="font-mono text-[10px] text-[#171715]/45">{item.day}</span>
                    <span className="grid h-11 w-11 shrink-0 place-items-center border border-[#171715]/20 text-[#171715] transition-colors group-hover:border-[#e96b3b] group-hover:text-[#e96b3b]"><Icon size={20} strokeWidth={1.5} className="icon-active" /></span>
                    <span className="min-w-0 flex-1"><span className={`schedule-title block font-display text-2xl font-bold uppercase leading-[0.9] tracking-[-0.04em] sm:text-3xl ${isOpen ? "schedule-title-live" : ""}`}>{item.title}</span><span className="mt-2 flex flex-wrap items-center gap-2 font-mono text-[9px] uppercase tracking-[0.12em] text-[#171715]/50"><span>{item.tag} · <span className="whitespace-nowrap">{item.duration}</span></span><span className="tool-identity"><span className="tool-logo" aria-hidden="true">{item.toolMark}</span><span>{item.toolName}</span></span></span></span>
                    <span className={`schedule-toggle ${isOpen ? "schedule-toggle-open" : ""}`}><Plus size={17} /></span>
                  </button>
                  {isOpen && <div className="schedule-details grid gap-7 pb-8 pl-0 lg:grid-cols-[1.15fr_0.85fr] sm:pl-[7.6rem]"><div className="space-y-4"><p className="max-w-xl text-sm leading-relaxed text-[#171715]/70">{item.details}</p><ol className="space-y-3">{item.blocks.map((block) => <li key={block.id}><div className="flex flex-col gap-1.5 border border-[#171715]/15 bg-[#f2efe6]/60 p-3 sm:flex-row sm:items-baseline sm:gap-4"><span className="font-mono text-[9px] uppercase tracking-[0.13em] text-[#e96b3b]">{block.id}</span><span className="min-w-0 flex-1"><span className="block font-display text-sm font-bold uppercase tracking-[-0.02em] text-[#171715]">{block.title}</span><span className="mt-1 block text-[11px] leading-relaxed text-[#171715]/60">{block.text}</span></span><span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.12em] text-[#171715]/50">{block.minutes}</span></div><span className="mt-1.5 block font-mono text-[8px] uppercase tracking-[0.12em] text-[#171715]/45">↳ entregável / {block.deliverable}</span>{item.pauseAfter === block.id && <span className="mt-3 flex items-center justify-center gap-2 border-y border-dashed border-[#171715]/20 py-2 font-mono text-[9px] uppercase tracking-[0.13em] text-[#171715]/45"><Pause size={12} /> {item.pause} · {item.pauseAt}</span>}</li>)}</ol></div><div className="border-l border-[#171715]/20 pl-5"><span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#171715]/45">ferramentas em foco</span><p className="mt-2 font-display text-xl font-bold uppercase leading-[0.95] tracking-[-0.03em]">{item.tools}</p><div className="mt-4 space-y-2 font-mono text-[9px] uppercase tracking-[0.12em] text-[#171715]/55"><p className="flex items-center gap-2 text-[#e96b3b]"><CircleCheck size={13} className="icon-pulse" /> {item.output}</p><p className="flex items-center gap-2"><Clock3 size={13} /> <span className="whitespace-nowrap">{item.duration}</span></p><p className="flex items-center gap-2"><Users size={13} /> turma de 12 a 15</p></div></div></div>}
                </div>;
              })}
            </div>
          </div>
        </section>

        <div className="bg-[#171715] px-4 py-6 text-[#f2efe6] sm:px-8 lg:px-12">
          <div className="field-content relative mx-auto flex max-w-[1400px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-start gap-3 font-mono text-[10px] uppercase leading-relaxed tracking-[0.13em] text-[#f2efe6]/75">
              <UserCheck size={15} className="mt-[-2px] shrink-0 text-[#e96b3b]" />
              protocolo human-in-the-loop: nenhuma linha de código entra no Rhino sem inspeção e aprovação explícita.
            </p>
            <span className="font-mono text-[10px] uppercase tracking-[0.13em] text-[#f2efe6]/45">rollback ativo · sem duplicados · v001 → v003</span>
          </div>
        </div>
        <section id="publico" className="bg-[#171715] px-4 py-24 text-[#f2efe6] sm:px-8 sm:py-32 lg:px-12">
          <div className="field-content relative mx-auto grid max-w-[1400px] gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
            <div className="title-col"><p className="section-kicker text-[#b6c9bb]">04 / para quem é</p><h2 className="font-display title-fit mt-5 font-black uppercase leading-[0.88] tracking-[-0.06em]">para quem<br /><span className="text-[#e96b3b]">projeta o próximo.</span></h2><div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[#f2efe6]/45"><span className="flex items-center gap-3"><Users size={15} /> 12 a 15 lugares · crítica próxima</span><a href="#mentor" className="group flex items-center gap-3 transition-colors hover:text-[#e96b3b]"><UserCheck size={15} /> conduzido por ivo garcia <ArrowUpRight size={13} className="transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></a></div></div>
            <div className="grid gap-0 border-y border-[#f2efe6]/15">
              {["Arquitetos que querem aumentar o campo de possibilidades sem abdicar do rigor.", "Estudantes que querem transformar curiosidade em método.", "Equipas que precisam de prototipar antes de decidir.", "Designers que querem trabalhar com sistemas, não só com imagens."].map((item, index) => <div key={item} className="group flex items-start gap-5 border-b border-[#f2efe6]/15 py-6 last:border-0"><span className="font-mono text-[10px] text-[#e96b3b]">0{index + 1}</span><p className="max-w-lg font-display text-2xl font-bold uppercase leading-[0.95] tracking-[-0.03em] text-[#f2efe6]/85 transition-colors group-hover:text-[#e96b3b] sm:text-3xl">{item}</p><ArrowUpRight size={19} className="ml-auto shrink-0 text-[#f2efe6]/40 transition-transform duration-200 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-[#e96b3b]" /></div>)}
            </div>
          </div>
        </section>

        <section id="mentor" className="scroll-mt-10 bg-[#f2efe6] px-4 py-24 text-[#171715] sm:px-8 sm:py-32 lg:px-12">
          <div className="field-content relative mx-auto max-w-[1400px]">
            <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
              <div className="title-col">
                <p className="section-kicker">05 / quem conduz</p>
                <h2 className="font-display title-fit title-fit-tight mt-5 font-black uppercase leading-[0.88] tracking-[-0.06em]">
                  não é um curso de ai.<br />
                  <span className="text-[#e96b3b]">é um curso de arquitetura.</span>
                </h2>
                <p className="mt-7 max-w-md text-sm leading-relaxed text-[#171715]/70">{mentor.lead}</p>
              </div>

              <div className="grid gap-10 sm:grid-cols-[0.62fr_1fr] sm:gap-8">
                {/* Retrato tratado como estampa: legenda por baixo, nunca por
                    cima da imagem (mesma convencao das imagens do capitulo 02).
                    O fundo de estudio e' preservado — ver
                    client/scripts/brand/make_mentor_photo.py. */}
                <figure className="m-0">
                  <img
                    src={mentor.photo.src}
                    srcSet={`${mentor.photo.srcSm} 420w, ${mentor.photo.src} 760w`}
                    sizes="(max-width: 640px) 100vw, 300px"
                    alt={mentor.photo.alt}
                    width={mentor.photo.width}
                    height={mentor.photo.height}
                    loading="lazy"
                    decoding="async"
                    className="block w-full border border-[#171715]/20"
                  />
                  <figcaption className="mt-3 font-mono text-[9px] uppercase leading-relaxed tracking-[0.12em] text-[#171715]/50">
                    {mentor.photo.caption}
                  </figcaption>
                </figure>

                <div className="min-w-0">
                  <p className="font-display text-3xl font-black uppercase leading-none tracking-[-0.05em] sm:text-4xl">
                    {mentor.name}
                  </p>
                  <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.14em] text-[#e96b3b]">{mentor.role}</p>

                  <dl className="mt-7 border-t border-[#171715]/20">
                    {mentor.credentials.map((item) => (
                      <div key={item.label} className="border-b border-[#171715]/20 py-3.5">
                        <dt className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#171715]/45">{item.label}</dt>
                        <dd className="mt-1.5">
                          <span className="block font-display text-lg font-bold uppercase leading-none tracking-[-0.03em] text-[#171715]/90">{item.value}</span>
                          <span className="mt-2 block text-[13px] leading-relaxed text-[#171715]/60">{item.proof}</span>
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="faq" className="scroll-mt-10 bg-[#ddd7c7] px-4 py-24 sm:px-8 sm:py-32 lg:px-12">
          <div className="field-content relative mx-auto grid max-w-[1200px] gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="title-col"><p className="section-kicker">06 / ainda tens dúvidas?</p><h2 className="font-display title-fit title-fit-tight mt-5 font-black uppercase leading-[0.88] tracking-[-0.06em]">perguntas<br /><span className="text-[#e96b3b]">honestas.</span></h2></div>
            <div className="border-t border-[#171715]/20">
              {faqs.map((faq, index) => { const open = openFaq === index; return <div key={faq.question} className="border-b border-[#171715]/20"><button type="button" onClick={() => setOpenFaq(open ? null : index)} className="flex w-full items-center gap-5 py-6 text-left"><span className="font-mono text-[10px] text-[#171715]/45">0{index + 1}</span><span className="flex-1 font-display text-xl font-bold uppercase leading-[0.95] tracking-[-0.03em] sm:text-2xl">{faq.question}</span><span className={`grid h-8 w-8 shrink-0 place-items-center border border-[#171715]/25 transition-colors ${open ? "bg-[#e96b3b]" : ""}`}>{open ? <Minus size={15} /> : <Plus size={15} />}</span></button>{open && <div className="pb-7 pl-9 pr-10 text-sm leading-relaxed text-[#171715]/65">{faq.answer}</div>}</div>; })}
            </div>
          </div>
        </section>

        <section id="inscricao" className="scroll-mt-10 bg-[#e96b3b] px-4 py-24 sm:px-8 sm:py-32 lg:px-12">
          <div className="field-content relative mx-auto max-w-[1400px]">
            <div ref={cardStageRef} className="relative grid gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-start">
              <div className="title-col"><p className="section-kicker">07 / inscrição</p><h2 className="font-display title-fit mt-5 font-black uppercase leading-[0.82] tracking-[-0.06em]">faz parte<br /><span className="text-[#f2efe6]">do sistema.</span></h2><p className="mt-8 max-w-sm text-base leading-relaxed text-[#171715]/75">Conta-nos onde estás no teu processo e recebe a informação certa para entrares na próxima turma.</p><div className="mt-8 flex flex-wrap gap-3"><button type="button" onClick={() => scrollToId("programa")} className="button-dark group">ver cronograma <ArrowRight size={14} className="transition-transform duration-200 group-hover:translate-x-1" /></button><a href="#faq" className="button-ghost-dark group">ler perguntas <ArrowUpRight size={14} className="transition-transform duration-200 group-hover:-translate-y-1 group-hover:translate-x-1" /></a></div></div>
              <div
                className={`contact-card lg:relative lg:z-10 ${cardDragging ? "is-dragging" : ""}`}
                style={{ transform: `translate3d(${cardOffset.x}px, ${cardOffset.y}px, 0)` }}
              >
                <div className="flex items-start justify-between gap-5">
                  <div><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#171715]/55">pedido de informação / 2026</p><h3 className="font-display mt-4 text-3xl font-bold uppercase leading-[0.9] tracking-[-0.04em] sm:text-4xl">vamos começar<br />pela tua pergunta.</h3></div>
                  <button
                    type="button"
                    className="contact-drag-handle shrink-0"
                    aria-label="Mover a caixa do formulário. Usa as setas do teclado, com Shift para passos maiores."
                    onPointerDown={handleCardPointerDown}
                    onPointerMove={handleCardPointerMove}
                    onPointerUp={endCardDrag}
                    onPointerCancel={endCardDrag}
                    onKeyDown={handleCardKeyDown}
                  >
                    <span className="contact-drag-grip" aria-hidden="true"><span /><span /><span /></span>
                  </button>
                </div>
                {formOutcome && <div data-copy-transient className="form-success" role="status"><span className="grid h-8 w-8 place-items-center rounded-full bg-[#b6c9bb] text-[#171715]"><CircleCheck size={16} className="icon-pulse" /></span><span>{formOutcome === "sent" ? <><strong>Pedido enviado.</strong><small>Recebemos o teu pedido — respondemos para o teu email em 24h úteis.</small></> : <><strong>Pedido preparado.</strong><small>Confirma o envio para {CONTACT_EMAIL} — abrimos o teu email com tudo preenchido.</small></>}</span></div>}
                <form onSubmit={handleSubmit} className="mt-9 space-y-5" noValidate>
                  <div className="grid gap-5 sm:grid-cols-2"><div><input aria-label="Nome" name="name" value={formValues.name} onChange={(event) => handleFieldChange("name", event.target.value)} placeholder="o teu nome" className={`contact-input ${formErrors.name ? "contact-input-error" : formValues.name ? "contact-input-valid" : ""}`} />{formErrors.name && <p className="field-error">{formErrors.name}</p>}</div><div><input aria-label="Email" name="email" type="email" value={formValues.email} onChange={(event) => handleFieldChange("email", event.target.value)} placeholder="o-teu@email.com" className={`contact-input ${formErrors.email ? "contact-input-error" : formValues.email ? "contact-input-valid" : ""}`} />{formErrors.email && <p className="field-error">{formErrors.email}</p>}</div></div>
                  <div><select aria-label="Perfil" name="profile" value={formValues.profile} onChange={(event) => handleFieldChange("profile", event.target.value)} className={`contact-input ${formErrors.profile ? "contact-input-error" : "contact-input-valid"}`}><option value="">escolhe o teu perfil</option><option value="arquitetura">sou arquiteto/a</option><option value="estudante">sou estudante</option><option value="equipa">represento uma equipa</option><option value="outro">outro perfil</option></select>{formErrors.profile && <p className="field-error">{formErrors.profile}</p>}</div>
                  <div><textarea aria-label="Mensagem" name="message" rows={3} value={formValues.message} onChange={(event) => handleFieldChange("message", event.target.value)} placeholder="Tenho uma questão. (opcional)" className={`contact-input resize-none ${formErrors.message ? "contact-input-error" : formValues.message ? "contact-input-valid" : ""}`} />{formErrors.message && <p className="field-error">{formErrors.message}</p>}</div>
                  <div className="flex flex-col gap-4 border-t border-[#171715]/20 pt-5 sm:flex-row sm:items-center sm:justify-between"><span className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.12em] text-[#171715]/55"><Check size={13} /> resposta em 24h úteis</span><button type="submit" disabled={formSending} className="submit-cta group disabled:opacity-60 disabled:cursor-not-allowed">{formSending ? "a enviar…" : "enviar pedido"} <Send size={15} className="transition-transform duration-200 group-hover:translate-x-1 group-hover:-translate-y-1" /></button></div>
                </form>
                <p className="mt-4 font-mono text-[9px] uppercase tracking-[0.12em] text-[#171715]/55">ou envia directamente para{" "}<a href={`mailto:${CONTACT_EMAIL}`} className="text-[#171715] underline decoration-[#e96b3b] decoration-2 underline-offset-2 transition-colors hover:text-[#e96b3b]">{CONTACT_EMAIL}</a></p>
                {(cardOffset.x !== 0 || cardOffset.y !== 0) && (
                  <button type="button" data-copy-transient className="contact-reset" onClick={() => { setCardOffset({ x: 0, y: 0 }); setCardDragging(false); }}>
                    <RefreshCw size={11} /> repor posição
                  </button>
                )}
              </div>
            </div>
            <div className="mt-20 border border-[#171715]/25 bg-[#171715] p-6 text-[#f2efe6] sm:p-8">
              <div className="flex flex-col gap-4 border-b border-[#f2efe6]/15 pb-6 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                  <p className="section-kicker text-[#b6c9bb]">condições da turma</p>
                  <h3 className="font-display mt-3 max-w-xl text-2xl font-bold uppercase leading-[0.92] tracking-[-0.04em] sm:text-3xl">investimento e o que fica contigo</h3>
                </div>
                <span className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.13em] text-[#f2efe6]/50"><Users size={13} /> lotação · 12 a 15 participantes</span>
              </div>

              <div className="mt-8 grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
                <div>
                  <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#f2efe6]/45">datas e horário</span>
                  <div className="mt-4 border-t border-[#f2efe6]/15">
                    {[
                      { label: "sessão 01", value: "terça 10 novembro 2026" },
                      { label: "sessão 02", value: "quinta 12 novembro 2026" },
                      { label: "horário", value: "18:30—21:30 WET · 3 h" },
                      { label: "formato", value: "online ao vivo" },
                    ].map((row) => (
                      <div key={row.label} className="flex items-center justify-between gap-4 border-b border-[#f2efe6]/10 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] last:border-0">
                        <span className="text-[#f2efe6]/45">{row.label}</span>
                        <span className="text-right whitespace-nowrap text-[#f2efe6]">{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col justify-between gap-8">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="border border-[#e96b3b] bg-[#e96b3b]/10 p-5">
                      <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#e96b3b]">early bird</span>
                      <p className="mt-3 font-display text-3xl font-black uppercase leading-none tracking-[-0.05em] sm:text-4xl">100 €{" "}<span className="align-top font-mono text-[10px] font-semibold tracking-[0.12em]">+ IVA</span></p>
                      <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.12em] text-[#f2efe6]/55">inscrição antecipada</p>
                    </div>
                    <div className="border border-[#f2efe6]/20 p-5">
                      <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#f2efe6]/50">preço normal</span>
                      <p className="mt-3 font-display text-3xl font-black uppercase leading-none tracking-[-0.05em] text-[#f2efe6]/90 sm:text-4xl">120 €{" "}<span className="align-top font-mono text-[10px] font-semibold tracking-[0.12em]">+ IVA</span></p>
                      <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.12em] text-[#f2efe6]/45">depois do early bird</p>
                    </div>
                  </div>

                  <div className="border-t border-[#f2efe6]/15 pt-5">
                    <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#f2efe6]/45">incluído na inscrição</span>
                    <ul className="mt-4 flex flex-wrap gap-2">
                      {["gravação por 30 dias", "ficheiros de exercício", "biblioteca de prompts", "checklist de qualidade", "certificado"].map((item) => (
                        <li key={item} className="flex items-center gap-2 border border-[#f2efe6]/20 px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-[#f2efe6]/70"><Check size={12} className="text-[#e96b3b]" /> {item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>


            <div className="mt-20 grid gap-5 border-t border-[#171715]/25 pt-5 font-mono text-[10px] uppercase tracking-[0.14em] sm:grid-cols-3"><div className="flex items-center gap-3"><CalendarDays size={15} className="icon-active" /> sessão 1 · ter 10 nov · sessão 2 · qui 12 nov</div><div className="flex items-center gap-3"><Clock3 size={15} className="icon-active" /> <span className="whitespace-nowrap">18:30—21:30 WET</span> · 3 h cada</div><div className="flex items-center gap-3"><MapPin size={15} className="icon-active" /> online ao vivo · 12 a 15 lugares</div></div>
          </div>
        </section>
      </main>

      <footer className="bg-[#171715] px-4 py-8 text-[#f2efe6] sm:px-8 lg:px-12">
        <div className="field-content relative mx-auto flex max-w-[1400px] flex-col justify-between gap-8 sm:flex-row sm:items-end"><div className="min-w-0"><a href="#top" className="group flex w-fit items-center gap-3"><BrandMark height={38} /></a><p className="mt-4 max-w-sm text-[13px] leading-relaxed text-[#f2efe6]/60">Na 3DHR Training a qualidade de ensino é a nossa excelência.</p><p className="mt-2 font-mono text-[9px] uppercase tracking-[0.13em] text-[#f2efe6]/40">um workshop para arquitetos que não esperam pelo futuro.</p></div><div className="flex items-center gap-6 font-mono text-[10px] uppercase tracking-[0.12em] text-[#f2efe6]/55"><a href="#processo" className="transition-colors hover:text-[#e96b3b]">Processo</a><a href="#faq" className="transition-colors hover:text-[#e96b3b]">FAQ</a><a href={`mailto:${CONTACT_EMAIL}`} className="transition-colors hover:text-[#e96b3b]">{CONTACT_EMAIL}</a><span>© 2026 3DHR Training</span></div></div>
      </footer>
      <a href="#inscricao" className="floating-enroll group"><span className="floating-enroll-dot" /><span>inscrever agora</span><ArrowUpRight size={15} className="transition-transform duration-200 group-hover:-translate-y-1 group-hover:translate-x-1" /></a>
    </div>
  );
}
