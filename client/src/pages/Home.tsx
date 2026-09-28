import { useEffect, useState, type FormEvent } from "react";
import {
  Activity,
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Box,
  Braces,
  CalendarDays,
  Check,
  ChevronDown,
  CircleCheck,
  ClipboardList,
  Clock3,
  Cpu,
  Eye,
  FileCode2,
  Layers3,
  Library,
  MapPin,
  Menu,
  Minus,
  MonitorPlay,
  MousePointer2,
  Orbit,
  Pause,
  Play,
  Plus,
  Presentation,
  RefreshCw,
  Ruler,
  ScanLine,
  Send,
  ShieldCheck,
  Sparkles,
  Terminal,
  UserCheck,
  Users,
  VolumeX,
  WandSparkles,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

const HERO_IMAGE = "/media/hero-pavilion.webp";

// As quatro imagens que sustentam a pagina. Nenhuma leva texto ou painel
// sobreposto: a legenda vive sempre abaixo da imagem.
const PRINCIPAL_IMAGES = [
  {
    src: "/media/hero-pavilion.webp",
    alt: "Pavilhao de madeira laminado curvado, construido e aberto ao publico",
    index: "01",
    title: "Pavilhao construido",
    caption:
      "Estrutura em madeira laminada de curvacelas entrelacadas, com nucleo central e base circular.",
    wide: true,
  },
  {
    src: "/media/curation-reference.jpg",
    alt: "Utilizadores sentados no banco de madeira sob o pavilhao",
    index: "02",
    title: "Uso e escala humana",
    caption:
      "O pavilhao como lugar de estar. A altura do banco e a vao livre sao decididas pelo uso.",
    wide: false,
  },
  {
    src: "/media/anatomy-detail.png",
    alt: "Vista do nucleo estrutural do pavilhao, com nervuras convergindo na base",
    index: "03",
    title: "Nucleo estrutural",
    caption:
      "As costelas convergem num nucleo central sobre base circular. O desenho e a estrutura sao o mesmo elemento.",
    wide: false,
  },
  {
    src: "/media/project-reference.jpg",
    alt: "Prancha tecnica do pavilhao: estrutura, perspectiva do nucleo e vista geral com cotas",
    index: "04",
    title: "Prancha tecnica",
    caption:
      "Estrutura, perspectiva do nucleo e vista geral com cotas, detalhes de material e componentes.",
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
      "Capturas clay e AO do modelo alimentam uma renderização image-to-image que respeita a silhueta construída: a mesma geometria, com luz contemporânea, materialidade e escala humana.",
    tool: "Nano Banana 2",
    icon: WandSparkles,
    color: "#e96b3b",
    signal: "Fidelidade à silhueta construída",
    detail: "clay / AO → render 16:9",
    proof: "/media/result-night.webp",
    input: "captura clay / AO",
    output: "imagem 16:9",
  },
  {
    id: "time",
    number: "05",
    eyebrow: "TEMPO",
    title: "A ideia ganha tempo.",
    description:
      "Do render aprovado nasce um plano contínuo de seis a oito segundos — dolly-in ou órbita suave — com as costelas estáveis quadro a quadro. O projeto passa a poder ser apresentado em movimento.",
    tool: "Gemini Omni / Veo",
    icon: Orbit,
    color: "#f2b544",
    signal: "Estabilidade estrutural no plano",
    detail: "render → clipe 06—08 s",
    proof: "/media/motion-context-poster.webp",
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
      "Entre 6 e 8. É o número que permite acompanhar cada modelo ao vivo durante as sessões e dar crítica individual no showcase final de cada formando.",
  },
];

const resultMedia = [
  {
    id: "direction",
    kind: "image",
    category: "concept",
    label: "01 / direção",
    title: "a forma começa como pergunta.",
    tool: "Nano Banana 2",
    src: "/media/result-concept.webp",
    input: "brief + referências",
    output: "still / 16:9",
    caption: "A primeira leitura espacial: vocabulário, luz e escala antes de existir geometria.",
  },
  {
    id: "parameters",
    kind: "image",
    category: "parameters",
    label: "02 / parâmetros",
    title: "a regra começa a responder.",
    tool: "Gemini Pro",
    src: "/media/result-parametric.webp",
    input: "ficha de requisitos",
    output: "parametros.json · 03 variantes",
    caption: "A mesma intenção com decisões distintas: raio, altura, abertura e número de costelas em variação controlada.",
  },
  {
    id: "definition",
    kind: "image",
    category: "system",
    label: "03 / sistema",
    title: "o código produz geometria válida.",
    tool: "Cline + Rhino MCP",
    src: "/media/result-system.webp",
    input: "JSON + sessão 3D",
    output: "sólidos fechados",
    caption: "A definição que corre no Rhino: parâmetros, motor de computação e, à direita, as placas e os encaixes de fábrico.",
  },
  {
    id: "fabrication",
    kind: "image",
    category: "execution",
    label: "04 / execução",
    title: "o desenho prepara o corte.",
    tool: "RhinoScript / CNC",
    src: "/media/result-execution.webp",
    input: "sólidos validados",
    output: "pranchas + placas 2D",
    caption: "Prancha de execução em verdadeira grandeza: planta, alçados, secções A-A e B-B, detalhes de união e amostra de materiais.",
  },
  {
    id: "atmosphere",
    kind: "image",
    category: "image",
    label: "05 / atmosfera",
    title: "a matéria ganha presença.",
    tool: "Nano Banana 2",
    src: "/media/result-night.webp",
    input: "captura clay / AO",
    output: "render / 16:9",
    caption: "O render final mantém a silhueta construída e acrescenta luz, materialidade e escala humana.",
  },
  {
    id: "motion",
    kind: "motion",
    category: "video",
    label: "06 / movimento",
    title: "a ideia ganha tempo.",
    tool: "Gemini Omni / Veo",
    poster: "/media/motion-poster.webp",
    video: "/media/motion-pavilion.mp4",
    input: "render aprovado",
    output: "motion / 00:10",
    caption: "Plano contínuo de dez segundos: a estrutura em órbita suave, sem deformação das costelas.",
  },
  {
    id: "context",
    kind: "motion",
    category: "video",
    label: "07 / contexto",
    title: "o pavilhão encontra o lugar.",
    tool: "Veo",
    poster: "/media/motion-context-poster.webp",
    video: "/media/motion-context.mp4",
    input: "estudo + lugar",
    output: "motion / 00:10",
    caption: "O objeto no parque, com pessoas, estantes e banco: a escala humana que fecha o argumento.",
  },
] as const;

type MediaFilter = "todos" | "concept" | "parameters" | "system" | "execution" | "image" | "video";

const mediaFilters: { id: MediaFilter; label: string }[] = [
  { id: "todos", label: "todos" },
  { id: "concept", label: "conceito" },
  { id: "parameters", label: "parâmetros" },
  { id: "system", label: "sistema" },
  { id: "execution", label: "execução" },
  { id: "image", label: "imagem" },
  { id: "video", label: "vídeo" },
];

const programItems = [
  {
    day: "SESSÃO 01",
    title: "curadoria & modelação agêntica",
    text: "Dados técnicos ancorados, parâmetros explícitos e a primeira versão do modelo escrita por agente sob supervisão.",
    icon: Library,
    tag: "3 h · dia 1",
    duration: "10:00—13:00 WET",
    tools: "NotebookLM · Gemini Pro · Cline + Rhino MCP",
    toolMark: "NL",
    toolName: "NotebookLM",
    output: "4 fases · sólidos fechados",
    pause: "intervalo de 10 min",
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
    tag: "3 h · dia 2",
    duration: "10:00—13:00 WET",
    tools: "Nano Banana 2 · Gemini Omni / Veo",
    toolMark: "NB",
    toolName: "Nano Banana 2",
    output: "painel 16:9 · pitch 3 min",
    pause: "intervalo de 10 min",
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

const anatomy = [
  {
    step: "1",
    title: "Espinha helicoidal cónica",
    text: "Raio e altura variam em conjunto: definem a entrada generosa de 60° e culminam no acolhimento do banco interior.",
  },
  {
    step: "2",
    title: "24 costelas radiais paramétricas",
    text: "Perfis verticais únicos gerados por código — a curvatura e a profundidade de sombra mudam de costela para costela.",
  },
  {
    step: "3",
    title: "Juntas waffle com folga",
    text: "Entalhes a 50% da espessura com 0,5 mm de folga para montagem a seco e rigidez tridimensional imediata.",
  },
] as const;

const studySpecs = [
  "envolvente Ø 5 000 · h 3 000 mm",
  "24 costelas · gama 20—28",
  "chapa 24 mm (ou 18 mm)",
  "banco central 450 mm",
  "folga de encaixe 0,5 mm",
] as const;

const toleranceRows = [
  { parameter: "Unidades de trabalho", value: "Milímetros (mm)", rule: "Tolerância absoluta de 0,01 mm", status: "Obrigatório" },
  { parameter: "Diâmetro exterior / altura", value: "5 000 / 3 000 mm", rule: "Envolvente cónica helicoidal", status: "Base de projeto" },
  { parameter: "Abertura de entrada", value: "60° de arco", rule: "Circulação pedonal desobstruída", status: "Base de projeto" },
  { parameter: "Altura do banco central", value: "450 mm", rule: "Cota ergonómica de sentar", status: "Validado" },
  { parameter: "Costelas radiais", value: "24 costelas", rule: "Gama de variação permitida: 20 a 28", status: "Paramétrico" },
  { parameter: "Espessura nominal", value: "24 mm (ou 18 mm)", rule: "Contraplacado marítimo de bétula", status: "Catálogo" },
  { parameter: "Folga mecânica de encaixe", value: "0,5 mm total", rule: "Dilatação do material e corte CNC", status: "Hipótese de ensaio" },
  { parameter: "Largura do entalhe waffle", value: "24,5 mm", rule: "Espessura nominal (24 mm) + folga (0,5 mm)", status: "Regra de script" },
  { parameter: "Profundidade do encaixe", value: "50% da secção", rule: "Encaixe mútuo meia-madeira (half-lap)", status: "Regra de script" },
] as const;

const statusTone: Record<string, string> = {
  "obrigatório": "border-[#171715] bg-[#171715] text-[#f2efe6]",
  "validado": "border-[#171715] bg-[#171715] text-[#f2efe6]",
  "catálogo": "border-[#171715] bg-[#171715] text-[#f2efe6]",
  "base de projeto": "border-[#171715]/35 text-[#171715]/70",
  "paramétrico": "border-[#e96b3b] bg-[#e96b3b] text-[#171715]",
  "hipótese de ensaio": "border-[#e96b3b] text-[#e96b3b]",
  "regra de script": "border-[#171715]/30 bg-[#b6c9bb] text-[#171715]",
};

const auditChecks = [
  { title: "Sólidos fechados", text: "Cada costela tem de fechar como sólido válido antes de gerar placas — o script verifica antes de escrever." },
  { title: "Camadas por família", text: "Placas, encaixes, rótulos e chapas saem em camadas separadas, prontas para nesting e pós-processamento." },
  { title: "Sem duplicados", text: "O agente compara com o que já existe no documento e faz rollback se o resultado não for válido." },
] as const;

const deliverables = [
  { id: "01", icon: Box, title: "Modelo paramétrico funcional", text: "Ficheiro .3dm com sólidos fechados, banco a 450 mm e camadas organizadas.", meta: ".3dm" },
  { id: "02", icon: FileCode2, title: "Script reutilizável", text: "Código .py ligado a um ficheiro externo de parâmetros: regeneras variantes sem refazer o modelo.", meta: ".py" },
  { id: "03", icon: MonitorPlay, title: "Painel de apresentação 16:9", text: "Plantas, secções, capturas técnicas, render fotorreal e clipe — pronto para portfólio ou concurso.", meta: "16:9" },
  { id: "04", icon: Sparkles, title: "Kit de prompts e guiões", text: "Todos os guiões testados em aula para reaplicar o pipeline num projeto do atelier.", meta: "kit" },
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

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function Home() {
  const [selectedStage, setSelectedStage] = useState<StageId>("curation");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [formValues, setFormValues] = useState<FormValues>({ name: "", email: "", profile: "arquitetura", message: "" });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [activeMedia, setActiveMedia] = useState(0);
  const [carouselPaused, setCarouselPaused] = useState(false);
  const [expandedProgram, setExpandedProgram] = useState(0);
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>("todos");

  const activeStage = stages.find((stage) => stage.id === selectedStage) ?? stages[0];
  const ActiveIcon = activeStage.icon;
  const filteredMedia = mediaFilter === "todos" ? resultMedia : resultMedia.filter((media) => media.category === mediaFilter);
  const activeMediaItem = filteredMedia[activeMedia] ?? filteredMedia[0];

  useEffect(() => {
    if (carouselPaused) return;
    const interval = window.setInterval(() => {
      setActiveMedia((current) => (current + 1) % filteredMedia.length);
    }, 7000);
    return () => window.clearInterval(interval);
  }, [carouselPaused, filteredMedia.length]);

  function handleMediaFilter(filter: MediaFilter) {
    setMediaFilter(filter);
    setActiveMedia(0);
  }

  function handleFieldChange(field: FormField, value: string) {
    setFormValues((current) => ({ ...current, [field]: value }));
    const error = validateField(field, value);
    setFormErrors((current) => {
      const next = { ...current };
      if (error) next[field] = error;
      else delete next[field];
      return next;
    });
    setFormSubmitted(false);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: FormErrors = {};
    (Object.keys(formValues) as FormField[]).forEach((field) => {
      const error = validateField(field, formValues[field]);
      if (error) nextErrors[field] = error;
    });
    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setFormSubmitted(false);
      toast.error("Revê os campos assinalados.", { description: "Falta uma pequena correcção antes de enviar." });
      return;
    }
    toast.success("Lugar sinalizado.", {
      description: "Enviámos os próximos passos para a tua caixa de entrada.",
    });
    setFormSubmitted(true);
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f2efe6] text-[#171715] selection:bg-[#e96b3b] selection:text-[#171715]">
      <div className="noise pointer-events-none fixed inset-0 z-50 opacity-[0.035]" />

      <div className="bg-[#171715] px-4 py-2 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-[#f2efe6] sm:text-[11px]">
        <span className="mr-2 text-[#e96b3b]">●</span> workshop online ao vivo · 2 sessões de 3 h · 17 e 18 outubro 2026 · 6 a 8 lugares
      </div>

      <header className="absolute left-0 right-0 top-9 z-40 px-4 py-5 sm:px-8 lg:px-12">
        <nav className="mx-auto flex max-w-[1400px] items-center justify-between">
          <a href="#top" className="group flex items-center gap-3" aria-label="IA para Arquitetura, início">
            <span className="grid h-9 w-9 place-items-center border border-[#f2efe6]/60 text-[#f2efe6] transition-colors group-hover:border-[#e96b3b] group-hover:text-[#e96b3b]">
              <span className="h-3 w-3 rotate-45 border border-current" />
            </span>
            <span className="font-display text-sm font-black uppercase tracking-[0.08em] text-[#f2efe6] sm:text-base">
              IA<span className="text-[#e96b3b]">/</span>ARQ
            </span>
          </a>

          <div className="hidden items-center gap-8 md:flex">
            <a href="#processo" className="nav-link">O processo</a>
            <a href="#objeto" className="nav-link">O objeto</a>
            <a href="#programa" className="nav-link">Programa</a>
            <a href="#resultados" className="nav-link">Resultados</a>
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
          <div className="mx-auto mt-4 max-w-[1400px] border border-[#f2efe6]/20 bg-[#171715]/95 p-5 backdrop-blur-xl md:hidden">
            <div className="flex flex-col gap-4 font-mono text-[11px] uppercase tracking-[0.14em] text-[#f2efe6]">
              <a href="#processo" onClick={() => setMobileOpen(false)}>O processo</a>
              <a href="#objeto" onClick={() => setMobileOpen(false)}>O objeto</a>
              <a href="#programa" onClick={() => setMobileOpen(false)}>Programa</a>
              <a href="#entregaveis" onClick={() => setMobileOpen(false)}>O que levas</a>
              <a href="#faq" onClick={() => setMobileOpen(false)}>FAQ</a>
              <button type="button" onClick={() => { setMobileOpen(false); scrollToId("inscricao"); }} className="button-primary mt-2 justify-center">
                Reservar lugar <ArrowUpRight size={14} />
              </button>
            </div>
          </div>
        )}
      </header>

      <main>
        <section
          id="top"
          className="relative isolate bg-[#1a1916] text-[#f2efe6]"
        >
          <figure className="relative w-full overflow-hidden bg-[#1a1916]">
            <img
              src={HERO_IMAGE}
              alt="Pavilhao de madeira laminado curvado, construido e aberto ao publico"
              className="block h-[62vh] min-h-[400px] w-full object-cover"
            />
          </figure>
          <div className="relative mx-auto flex max-w-[1400px] flex-col justify-end px-4 pb-14 pt-12 sm:px-8 sm:pb-20 lg:px-12">
            <div className="max-w-4xl">
              <div className="mb-7 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[#b6c9bb] sm:text-[11px]">
                <span className="h-px w-8 bg-[#e96b3b]" />
                arquitetura + inteligência artificial
              </div>
              <h1 className="font-display max-w-4xl text-[clamp(3.6rem,10vw,9rem)] font-black uppercase leading-[0.82] tracking-[-0.075em] text-[#f2efe6]">
                dá forma
                <br />
                <span className="text-[#e96b3b]">ao que</span>
                <br />
                ainda não existe.
              </h1>
              <div className="mt-8 flex max-w-xl flex-col gap-7 sm:flex-row sm:items-end sm:gap-10">
                <p className="max-w-sm text-sm leading-relaxed text-[#f2efe6]/70 sm:text-base">
                  Seis horas para atravessar a cadeia completa — curadoria ancorada, modelação agêntica no Rhino, render de silhueta fiel e clipe final — e sair com um pavilhão de madeira validado.
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
          <div className="marquee-track flex min-w-max items-center gap-8 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#171715]">
            <span>da curadoria ao clipe final</span><span>✳</span><span>human-in-the-loop</span><span>✳</span><span>estrutura waffle em bétula</span><span>✳</span><span>da curadoria ao clipe final</span><span>✳</span><span>human-in-the-loop</span><span>✳</span><span>estrutura waffle em bétula</span><span>✳</span><span>da curadoria ao clipe final</span><span>✳</span><span>human-in-the-loop</span><span>✳</span><span>estrutura waffle em bétula</span><span>✳</span>
          </div>
        </div>

        <section id="galeria" className="scroll-mt-10 bg-[#171715] px-4 py-20 sm:px-8 sm:py-24 lg:px-12">
          <div className="mx-auto max-w-[1400px]">
            <div className="mb-12 flex flex-col gap-4 sm:mb-16 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="font-display max-w-2xl text-[clamp(2.4rem,6vw,4.6rem)] font-black uppercase leading-[0.86] tracking-[-0.06em] text-[#f2efe6]">
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

        <section id="processo" className="scroll-mt-10 bg-[#f2efe6] px-4 py-24 sm:px-8 sm:py-32 lg:px-12">
          <div className="mx-auto max-w-[1400px]">
            <div className="mb-16 grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-end">
              <div>
                <p className="section-kicker">01 / o método</p>
                <h2 className="font-display mt-5 max-w-sm text-5xl font-black uppercase leading-[0.9] tracking-[-0.06em] sm:text-7xl">
                  uma ideia<br /><span className="text-[#e96b3b]">em movimento.</span>
                </h2>
              </div>
              <div className="flex max-w-xl flex-col gap-5 lg:pb-1">
                <p className="text-lg leading-relaxed text-[#171715]/75 sm:text-xl">
                  Não é uma aula sobre ferramentas. É uma experiência sobre como construir <em className="font-display font-bold">relações</em> entre elas — e quando intervir para que o resultado continue a ser teu.
                </p>
                <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#171715]/50"><span className="h-px w-8 bg-[#171715]/30" /> 03 momentos · 01 sistema de decisão</div>
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
                        <span className="flex-1"><span className="block font-display text-2xl font-bold uppercase tracking-[-0.03em]">{stage.eyebrow}</span><span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.12em] text-[#171715]/45">{stage.tool}</span></span>
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
                    <div><p className="font-mono text-[10px] uppercase tracking-[0.17em]" style={{ color: activeStage.color }}>{activeStage.number} / {activeStage.eyebrow}</p><h3 className="font-display mt-4 max-w-md text-4xl font-bold uppercase leading-[0.9] tracking-[-0.05em] sm:text-5xl">{activeStage.title}</h3></div>
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
                        {activeStage.proof ? (
                          <img key={activeStage.id} src={activeStage.proof} alt={`${activeStage.eyebrow} — evidência do processo`} className="carousel-image h-full w-full object-cover" />
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

        <section id="objeto" className="scroll-mt-10 bg-[#171715] px-4 py-24 text-[#f2efe6] sm:px-8 sm:py-32 lg:px-12">
          <div className="mx-auto max-w-[1400px]">
            <div className="grid gap-10 border-b border-[#f2efe6]/15 pb-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
              <div>
                <p className="section-kicker text-[#b6c9bb]">02 / o objeto</p>
                <h2 className="font-display mt-5 max-w-md text-5xl font-black uppercase leading-[0.88] tracking-[-0.06em] sm:text-7xl">
                  um pavilhão<br /><span className="text-[#e96b3b]">de leitura.</span>
                </h2>
              </div>
              <div className="flex max-w-xl flex-col gap-6">
                <p className="text-lg leading-relaxed text-[#f2efe6]/70 sm:text-xl">
                  Todas as turmas trabalham o mesmo objeto: uma estrutura waffle em contraplacado de bétula que é, ao mesmo tempo, lugar, abrigo e estante. Muda a variante — não o rigor.
                </p>
                <div className="flex items-start gap-3 font-mono text-[10px] uppercase tracking-[0.13em] text-[#f2efe6]/50">
                  <Ruler size={15} className="mt-[-2px] shrink-0 text-[#e96b3b]" /> valores de estudo · todos editáveis no ficheiro de parâmetros
                </div>
              </div>
            </div>

            <figure className="mt-12 border border-[#f2efe6]/15 bg-[#0f0f0d]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f2efe6]/10 px-4 py-3 font-mono text-[9px] uppercase tracking-[0.14em]">
                <span className="flex items-center gap-2 text-[#e96b3b]"><Layers3 size={13} /> prancha de execução</span>
                <span className="text-[#f2efe6]/50">vistas em verdadeira grandeza</span>
              </div>
              <img src="/media/result-execution.webp" alt="Prancha de execução do pavilhão: planta geral, alçados, secções A-A e B-B, detalhes de união e amostra de materiais" className="w-full object-contain" />
              <figcaption className="border-t border-[#f2efe6]/10 px-4 py-3 text-xs leading-relaxed text-[#f2efe6]/60">
                Planta, alçados, secções, detalhes de união e amostra de materiais: o nível de documentação que o script tem de produzir antes de o ficheiro sair da sessão.
              </figcaption>
            </figure>

            <div className="mt-10 grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
              <div>
                <h3 className="font-display text-2xl font-bold uppercase leading-[0.95] tracking-[-0.04em] sm:text-3xl">anatomia do pavilhão</h3>
                <ol className="mt-6 space-y-3">
                  {anatomy.map((item) => (
                    <li key={item.step} className="flex items-start gap-4 border border-[#f2efe6]/12 bg-[#f2efe6]/[0.03] p-4">
                      <span className="grid h-7 w-7 shrink-0 place-items-center bg-[#e96b3b] font-mono text-[11px] font-bold text-[#171715]">{item.step}</span>
                      <span>
                        <span className="block font-display text-base font-bold uppercase leading-tight tracking-[-0.02em] text-[#f2efe6]">{item.title}</span>
                        <span className="mt-1 block text-xs leading-relaxed text-[#f2efe6]/60">{item.text}</span>
                      </span>
                    </li>
                  ))}
                </ol>
                <div className="mt-6 flex flex-wrap gap-2">
                  {studySpecs.map((spec) => <span key={spec} className="border border-[#f2efe6]/20 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-[#f2efe6]/60">{spec}</span>)}
                </div>
              </div>

              <figure className="relative min-h-[380px] overflow-hidden border border-[#f2efe6]/15">
                <img src="/media/result-execution-detail.webp" alt="Detalhes construtivos do pavilhão: união de arcos, sistema metálico, prateleira modular e amostra de materiais" className="h-full w-full object-cover object-top" />
                <figcaption className="absolute inset-x-0 bottom-0 bg-[#171715]/85 px-3 py-2 font-mono text-[9px] uppercase leading-relaxed tracking-[0.12em] text-[#f2efe6]/70">
                  detalhes / união de arcos · prateleira modular · amostra de materiais
                </figcaption>
              </figure>
            </div>
          </div>
        </section>

        <section id="programa" className="scroll-mt-10 bg-[#b6c9bb] px-4 py-24 sm:px-8 sm:py-32 lg:px-12">
          <div className="mx-auto max-w-[1400px]">
            <div className="flex flex-col justify-between gap-8 border-b border-[#171715]/20 pb-8 sm:flex-row sm:items-end">
              <div><p className="section-kicker">03 / o programa</p><h2 className="font-display mt-5 max-w-2xl text-5xl font-black uppercase leading-[0.88] tracking-[-0.06em] sm:text-7xl">duas sessões para<br /><span className="text-[#e96b3b]">fechar o ciclo.</span></h2></div>
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
                    <span className="min-w-0 flex-1"><span className={`schedule-title block font-display text-2xl font-bold uppercase leading-[0.9] tracking-[-0.04em] sm:text-3xl ${isOpen ? "schedule-title-live" : ""}`}>{item.title}</span><span className="mt-2 flex flex-wrap items-center gap-2 font-mono text-[9px] uppercase tracking-[0.12em] text-[#171715]/50"><span>{item.tag} · {item.duration}</span><span className="tool-identity"><span className="tool-logo" aria-hidden="true">{item.toolMark}</span><span>{item.toolName}</span></span></span></span>
                    <span className={`schedule-toggle ${isOpen ? "schedule-toggle-open" : ""}`}><Plus size={17} /></span>
                  </button>
                  {isOpen && <div className="schedule-details grid gap-7 pb-8 pl-0 lg:grid-cols-[1.15fr_0.85fr] sm:pl-[7.6rem]"><div className="space-y-4"><p className="max-w-xl text-sm leading-relaxed text-[#171715]/70">{item.details}</p><ol className="space-y-3">{item.blocks.map((block) => <li key={block.id}><div className="flex flex-col gap-1.5 border border-[#171715]/15 bg-[#f2efe6]/60 p-3 sm:flex-row sm:items-baseline sm:gap-4"><span className="font-mono text-[9px] uppercase tracking-[0.13em] text-[#e96b3b]">{block.id}</span><span className="min-w-0 flex-1"><span className="block font-display text-sm font-bold uppercase tracking-[-0.02em] text-[#171715]">{block.title}</span><span className="mt-1 block text-[11px] leading-relaxed text-[#171715]/60">{block.text}</span></span><span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.12em] text-[#171715]/50">{block.minutes}</span></div><span className="mt-1.5 block font-mono text-[8px] uppercase tracking-[0.12em] text-[#171715]/45">↳ entregável / {block.deliverable}</span>{item.pauseAfter === block.id && <span className="mt-3 flex items-center justify-center gap-2 border-y border-dashed border-[#171715]/20 py-2 font-mono text-[9px] uppercase tracking-[0.13em] text-[#171715]/45"><Pause size={12} /> {item.pause} · 01:15—01:25</span>}</li>)}</ol></div><div className="border-l border-[#171715]/20 pl-5"><span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#171715]/45">ferramentas em foco</span><p className="mt-2 font-display text-xl font-bold uppercase leading-[0.95] tracking-[-0.03em]">{item.tools}</p><div className="mt-4 space-y-2 font-mono text-[9px] uppercase tracking-[0.12em] text-[#171715]/55"><p className="flex items-center gap-2 text-[#e96b3b]"><CircleCheck size={13} className="icon-pulse" /> {item.output}</p><p className="flex items-center gap-2"><Clock3 size={13} /> {item.duration}</p><p className="flex items-center gap-2"><Users size={13} /> turma de 6 a 8</p></div></div></div>}
                </div>;
              })}
            </div>
          </div>
        </section>

        <div className="bg-[#171715] px-4 py-6 text-[#f2efe6] sm:px-8 lg:px-12">
          <div className="mx-auto flex max-w-[1400px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-start gap-3 font-mono text-[10px] uppercase leading-relaxed tracking-[0.13em] text-[#f2efe6]/75">
              <UserCheck size={15} className="mt-[-2px] shrink-0 text-[#e96b3b]" />
              protocolo human-in-the-loop: nenhuma linha de código entra no Rhino sem inspeção e aprovação explícita.
            </p>
            <span className="font-mono text-[10px] uppercase tracking-[0.13em] text-[#f2efe6]/45">rollback ativo · sem duplicados · v001 → v003</span>
          </div>
        </div>

        <section id="resultados" className="scroll-mt-10 bg-[#f2efe6] px-4 py-24 sm:px-8 sm:py-32 lg:px-12">
          <div className="mx-auto max-w-[1400px]">
            <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr]">
              <div><p className="section-kicker">04 / o resultado</p><h2 className="font-display mt-5 max-w-md text-5xl font-black uppercase leading-[0.88] tracking-[-0.06em] sm:text-7xl">não é uma<br /><span className="text-[#e96b3b]">imagem bonita.</span></h2></div>
              <div className="flex flex-col justify-between gap-8 lg:pb-2"><p className="max-w-xl text-lg leading-relaxed text-[#171715]/75 sm:text-xl">É uma forma nova de tomar decisões. Uma ponte entre a intuição do arquiteto e a capacidade de explorar mais caminhos do que cabem num dia.</p><div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#171715]/50"><Zap size={14} className="text-[#e96b3b] icon-pulse" /> processo visível · resultado consequente</div></div>
            </div>

            <div className="mt-10 flex flex-wrap gap-2" role="group" aria-label="Filtrar resultados">
              {mediaFilters.map((filter) => <button type="button" key={filter.id} onClick={() => handleMediaFilter(filter.id)} className={`filter-button ${mediaFilter === filter.id ? "filter-button-active" : ""}`}>{filter.label}</button>)}
            </div>

            <div className="mt-6" onMouseEnter={() => setCarouselPaused(true)} onMouseLeave={() => setCarouselPaused(false)}>
              <div className="grid overflow-hidden border border-[#171715]/20 bg-[#171715] lg:grid-cols-[1.35fr_0.65fr]">
                <div className="flex flex-col">
                  <div className="relative min-h-[470px] overflow-hidden sm:min-h-[560px]">
                  {activeMediaItem.kind === "motion" ? (
                    <div className="motion-preview absolute inset-0">
                      <video src={activeMediaItem.video} poster={activeMediaItem.poster} className="h-full w-full object-cover" autoPlay muted loop playsInline preload="metadata" aria-label={`Preview de movimento do pavilhão — ${activeMediaItem.label}`} />
                      <div className="motion-scanline" />
                      <div className="motion-orbit motion-orbit-one" />
                      <div className="motion-orbit motion-orbit-two" />
                      <div className="absolute left-5 top-5 flex items-center gap-2 border border-[#b6c9bb]/30 bg-[#171715]/70 px-3 py-2 font-mono text-[9px] uppercase tracking-[0.13em] text-[#b6c9bb] backdrop-blur-md"><VolumeX size={13} /> {activeMediaItem.tool} / motion preview</div>
                      <div className="absolute bottom-6 right-6 grid h-14 w-14 place-items-center rounded-full border border-[#e96b3b] bg-[#e96b3b] text-[#171715]"><Play size={18} fill="currentColor" /></div>
                    </div>
                  ) : (
                    <img key={activeMediaItem.id} src={activeMediaItem.src} alt={activeMediaItem.title} className="carousel-image h-full w-full object-cover" />
                  )}
                  </div>
                  <div className="border-t border-[#f2efe6]/15 p-5 sm:p-7">
                    <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.15em] text-[#e96b3b]"><span className="h-px w-8 bg-[#e96b3b]" /> {activeMediaItem.label}</div>
                    <h3 className="font-display mt-4 max-w-xl text-4xl font-black uppercase leading-[0.88] tracking-[-0.06em] text-[#f2efe6] sm:text-6xl">{activeMediaItem.title}</h3>
                    <p className="mt-4 max-w-md text-sm leading-relaxed text-[#f2efe6]/65">{activeMediaItem.caption}</p>
                  </div>
                </div>

                <aside className="flex min-h-[470px] flex-col justify-between border-t border-[#f2efe6]/15 p-5 text-[#f2efe6] sm:min-h-[560px] sm:p-7 lg:border-l lg:border-t-0">
                  <div>
                    <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.15em] text-[#f2efe6]/45"><span>results / {String(activeMedia + 1).padStart(2, "0")}</span><span className="flex items-center gap-2 text-[#b6c9bb]"><Activity size={13} className="icon-pulse" /> live preview</span></div>
                    <div className="mt-10 space-y-3">
                      {[
                        { label: "input", value: activeMediaItem.input, icon: Braces },
                        { label: "engine", value: activeMediaItem.tool, icon: Cpu },
                        { label: "output", value: activeMediaItem.output, icon: ScanLine },
                      ].map((row) => { const Icon = row.icon; return <div key={row.label} className="flex items-center gap-3 border-b border-[#f2efe6]/10 pb-3"><span className="grid h-8 w-8 place-items-center border border-[#f2efe6]/15 text-[#e96b3b]"><Icon size={14} /></span><span className="flex-1"><span className="block font-mono text-[8px] uppercase tracking-[0.15em] text-[#f2efe6]/40">{row.label}</span><span className="mt-1 block font-display text-lg font-bold uppercase leading-none tracking-[-0.03em]">{row.value}</span></span><ChevronDown size={14} className="rotate-[-90deg] text-[#f2efe6]/35" /></div>; })}
                    </div>
                  </div>
                  <div>
                    <div className="mb-3 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.13em] text-[#f2efe6]/45"><span>timeline / 00:00—00:10</span><span className="flex items-center gap-2 text-[#e96b3b]"><span className="h-1.5 w-1.5 rounded-full bg-[#e96b3b]" /> {carouselPaused ? "manual" : "auto"}</span></div>
                    <div className="h-1 overflow-hidden bg-[#f2efe6]/10"><span key={activeMediaItem.id} className={`timeline-fill block h-full bg-[#e96b3b] ${carouselPaused ? "timeline-fill-paused" : ""}`} /></div>
                    <div className="mt-6 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.12em] text-[#b6c9bb]"><RefreshCw size={13} className={carouselPaused ? "" : "animate-spin-slow"} /> {carouselPaused ? "navegação manual" : "a alternar automaticamente"}</div>
                  </div>
                </aside>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-[auto_1fr_auto] md:items-center">
                <div className="flex items-center gap-2">
                  <button type="button" className="carousel-control" onClick={() => setActiveMedia((activeMedia - 1 + filteredMedia.length) % filteredMedia.length)} aria-label="Exemplo anterior"><ArrowRight size={17} className="rotate-180" /></button>
                  <button type="button" className="carousel-control" onClick={() => setActiveMedia((activeMedia + 1) % filteredMedia.length)} aria-label="Próximo exemplo"><ArrowRight size={17} /></button>
                  <button type="button" className="carousel-pause" onClick={() => setCarouselPaused((paused) => !paused)}>{carouselPaused ? <Play size={13} fill="currentColor" /> : <Pause size={13} />} {carouselPaused ? "retomar" : "pausar"}</button>
                </div>
                <div className="flex min-w-0 gap-2 overflow-x-auto pb-1">
                  {filteredMedia.map((media, index) => <button type="button" key={media.id} onClick={() => setActiveMedia(index)} className={`carousel-thumb ${activeMedia === index ? "carousel-thumb-active" : ""}`}><span className="font-mono text-[9px] uppercase tracking-[0.13em]">{media.label}</span><span className="mt-1 block font-display text-base font-bold uppercase leading-none tracking-[-0.03em]">{media.tool}</span></button>)}
                </div>
                <div className="flex items-center justify-end gap-2 font-mono text-[10px] uppercase tracking-[0.13em] text-[#171715]/50"><span>{String(activeMedia + 1).padStart(2, "0")} / {String(filteredMedia.length).padStart(2, "0")}</span><span className="h-px w-8 bg-[#171715]/25" /></div>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
                <div className="flow-chip"><span>01 / dados</span><strong>PDFs de catálogo</strong></div>
                <div className="flow-chip"><span>02 / parâmetros</span><strong>parametros.json</strong></div>
                <div className="flow-chip"><span>03 / geometria</span><strong>sólidos fechados</strong></div>
                <div className="flow-chip"><span>04 / imagem</span><strong>render 16:9</strong></div>
                <div className="flow-chip"><span>05 / tempo</span><strong>clipe 06—08 s</strong></div>
              </div>
            </div>
          </div>
        </section>

        <section id="entregaveis" className="scroll-mt-10 bg-[#f2efe6] px-4 py-24 sm:px-8 sm:py-32 lg:px-12">
          <div className="mx-auto max-w-[1400px]">
            <div className="flex flex-col justify-between gap-8 border-b border-[#171715]/20 pb-8 sm:flex-row sm:items-end">
              <div>
                <p className="section-kicker">05 / o que levas</p>
                <h2 className="font-display mt-5 max-w-2xl text-5xl font-black uppercase leading-[0.88] tracking-[-0.06em] sm:text-7xl">
                  sais com um sistema,<br /><span className="text-[#e96b3b]">não com um ficheiro.</span>
                </h2>
              </div>
              <p className="max-w-xs text-sm leading-relaxed text-[#171715]/70">Quatro entregáveis concretos e uma defesa pública de três minutos por formando.</p>
            </div>

            <div className="mt-10 grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="border-y border-[#171715]/20">
                {deliverables.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.id} className="group flex items-start gap-4 border-b border-[#171715]/20 py-6 last:border-0 sm:gap-6">
                      <span className="font-mono text-[10px] text-[#171715]/45">{item.id}</span>
                      <span className="grid h-11 w-11 shrink-0 place-items-center border border-[#171715]/20 text-[#171715] transition-colors group-hover:border-[#e96b3b] group-hover:text-[#e96b3b]"><Icon size={19} strokeWidth={1.6} className="icon-active" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-display text-xl font-bold uppercase leading-[0.95] tracking-[-0.03em] sm:text-2xl">{item.title}</span>
                        <span className="mt-2 block max-w-lg text-sm leading-relaxed text-[#171715]/65">{item.text}</span>
                      </span>
                      <span className="hidden shrink-0 border border-[#171715]/25 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-[#171715]/60 sm:block">{item.meta}</span>
                    </div>
                  );
                })}
              </div>

              <div className="bg-[#171715] p-6 text-[#f2efe6] sm:p-7">
                <div className="inline-flex items-center gap-2 bg-[#e96b3b] px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[#171715]"><Presentation size={13} /> showcase final ao vivo</div>
                <h3 className="font-display mt-5 text-3xl font-bold uppercase leading-[0.9] tracking-[-0.04em]">pitch de três minutos</h3>
                <p className="mt-3 text-sm leading-relaxed text-[#f2efe6]/65">Cada formando defende a sua variante em direto: conceito → modelo Rhino → render → clipe → reflexão crítica.</p>
                <div className="mt-6 border-t border-[#f2efe6]/15 pt-5">
                  {[
                    { label: "formato", value: "online síncrono" },
                    { label: "turma", value: "6 a 8 participantes" },
                    { label: "pré-requisito", value: "navegação básica no Rhino" },
                    { label: "software", value: "Rhino 8 · VS Code + Cline" },
                    { label: "unidades", value: "mm · tolerância 0,01 mm" },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between gap-4 border-b border-[#f2efe6]/10 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] last:border-0">
                      <span className="text-[#f2efe6]/45">{row.label}</span>
                      <span className="text-right text-[#f2efe6]">{row.value}</span>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => scrollToId("inscricao")} className="button-primary mt-6 w-full justify-center">candidatar-me <ArrowUpRight size={14} /></button>
                <p className="mt-3 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.12em] text-[#f2efe6]/45"><UserCheck size={13} /> protocolo human-in-the-loop em todas as fases</p>
              </div>
            </div>
          </div>
        </section>

        <section id="rigor" className="scroll-mt-10 bg-[#ddd7c7] px-4 py-24 sm:px-8 sm:py-32 lg:px-12">
          <div className="mx-auto max-w-[1400px]">
            <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-end">
              <div>
                <p className="section-kicker">06 / o rigor</p>
                <h2 className="font-display mt-5 max-w-sm text-5xl font-black uppercase leading-[0.88] tracking-[-0.06em] sm:text-7xl">
                  dados de catálogo,<br /><span className="text-[#e96b3b]">hipóteses de ensaio.</span>
                </h2>
              </div>
              <p className="max-w-xl text-lg leading-relaxed text-[#171715]/75">
                Cada valor do projeto viaja com estatuto: o que vem documentado de catálogo, o que é hipótese de ensaio e o que é regra escrita no script. É esta distinção que impede a IA de inventar construção.
              </p>
            </div>

            <div className="mt-12 overflow-x-auto border border-[#171715]/20 bg-[#f2efe6]">
              <table className="w-full min-w-[720px] border-collapse text-left">
                <thead>
                  <tr className="bg-[#171715] font-mono text-[10px] uppercase tracking-[0.13em] text-[#f2efe6]">
                    <th className="px-4 py-3 font-semibold">parâmetro de projeto</th>
                    <th className="px-4 py-3 font-semibold">valor de estudo</th>
                    <th className="px-4 py-3 font-semibold">tolerância / regra</th>
                    <th className="px-4 py-3 font-semibold">estatuto</th>
                  </tr>
                </thead>
                <tbody>
                  {toleranceRows.map((row) => (
                    <tr key={row.parameter} className="border-b border-[#171715]/15 transition-colors last:border-0 hover:bg-[#ddd7c7]/60">
                      <td className="px-4 py-3 font-display text-sm font-bold uppercase tracking-[-0.01em]">{row.parameter}</td>
                      <td className="px-4 py-3 font-mono text-xs">{row.value}</td>
                      <td className="px-4 py-3 text-xs leading-relaxed text-[#171715]/70">{row.rule}</td>
                      <td className="px-4 py-3"><span className={`inline-block border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] whitespace-nowrap ${statusTone[row.status.toLowerCase()] ?? "border-[#171715]/35 text-[#171715]/70"}`}>{row.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
              <figure className="border border-[#171715]/20 bg-[#171715]">
                <img src="/media/result-cnc.webp" alt="Recorte da definição paramétrica: mestres de visualização, auditoria estrutural e saída de fábrico CNC 2D" className="w-full" />
                <figcaption className="border-t border-[#f2efe6]/15 px-4 py-3 font-mono text-[9px] uppercase leading-relaxed tracking-[0.12em] text-[#f2efe6]/60">
                  saída de fábrico / placas · encaixes · rótulos · chapas CNC 2D
                </figcaption>
              </figure>
              <div className="bg-[#171715] p-6 text-[#f2efe6] sm:p-7">
                <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#e96b3b]"><ShieldCheck size={15} /> auditoria automática antes de exportar</div>
                <div className="mt-6 space-y-4">
                  {auditChecks.map((check, index) => (
                    <div key={check.title} className="flex items-start gap-4 border-b border-[#f2efe6]/12 pb-4 last:border-0 last:pb-0">
                      <span className="font-mono text-[10px] text-[#b6c9bb]">0{index + 1}</span>
                      <span>
                        <span className="block font-display text-lg font-bold uppercase leading-none tracking-[-0.02em]">{check.title}</span>
                        <span className="mt-2 block text-xs leading-relaxed text-[#f2efe6]/60">{check.text}</span>
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex items-start gap-2 font-mono text-[9px] uppercase leading-relaxed tracking-[0.12em] text-[#f2efe6]/45">
                  <ClipboardList size={14} className="mt-[-2px] shrink-0 text-[#e96b3b] icon-pulse" /> protótipo digital de estudo: a geometria sai preparada para nesting CNC, não para corte direto.
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="publico" className="bg-[#171715] px-4 py-24 text-[#f2efe6] sm:px-8 sm:py-32 lg:px-12">
          <div className="mx-auto grid max-w-[1400px] gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
            <div><p className="section-kicker text-[#b6c9bb]">07 / para quem é</p><h2 className="font-display mt-5 max-w-sm text-5xl font-black uppercase leading-[0.88] tracking-[-0.06em] sm:text-7xl">para quem<br /><span className="text-[#e96b3b]">projeta o próximo.</span></h2><div className="mt-9 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[#f2efe6]/45"><Users size={15} /> 6 a 8 lugares · crítica próxima<br /></div></div>
            <div className="grid gap-0 border-y border-[#f2efe6]/15">
              {["Arquitetos que querem aumentar o campo de possibilidades.", "Estudantes que querem transformar curiosidade em método.", "Equipas que precisam de prototipar antes de decidir.", "Designers que querem trabalhar com sistemas, não só imagens."].map((item, index) => <div key={item} className="group flex items-start gap-5 border-b border-[#f2efe6]/15 py-6 last:border-0"><span className="font-mono text-[10px] text-[#e96b3b]">0{index + 1}</span><p className="max-w-lg font-display text-2xl font-bold uppercase leading-[0.95] tracking-[-0.03em] text-[#f2efe6]/85 transition-colors group-hover:text-[#e96b3b] sm:text-3xl">{item}</p><ArrowUpRight size={19} className="ml-auto shrink-0 text-[#f2efe6]/40 transition-transform duration-200 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-[#e96b3b]" /></div>)}
            </div>
          </div>
        </section>

        <section id="faq" className="scroll-mt-10 bg-[#ddd7c7] px-4 py-24 sm:px-8 sm:py-32 lg:px-12">
          <div className="mx-auto grid max-w-[1200px] gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            <div><p className="section-kicker">08 / ainda tens dúvidas?</p><h2 className="font-display mt-5 max-w-sm text-5xl font-black uppercase leading-[0.88] tracking-[-0.06em] sm:text-7xl">perguntas<br /><span className="text-[#e96b3b]">honestas.</span></h2></div>
            <div className="border-t border-[#171715]/20">
              {faqs.map((faq, index) => { const open = openFaq === index; return <div key={faq.question} className="border-b border-[#171715]/20"><button type="button" onClick={() => setOpenFaq(open ? null : index)} className="flex w-full items-center gap-5 py-6 text-left"><span className="font-mono text-[10px] text-[#171715]/45">0{index + 1}</span><span className="flex-1 font-display text-xl font-bold uppercase leading-[0.95] tracking-[-0.03em] sm:text-2xl">{faq.question}</span><span className={`grid h-8 w-8 shrink-0 place-items-center border border-[#171715]/25 transition-colors ${open ? "bg-[#e96b3b]" : ""}`}>{open ? <Minus size={15} /> : <Plus size={15} />}</span></button>{open && <div className="pb-7 pl-9 pr-10 text-sm leading-relaxed text-[#171715]/65">{faq.answer}</div>}</div>; })}
            </div>
          </div>
        </section>

        <section id="inscricao" className="scroll-mt-10 bg-[#e96b3b] px-4 py-24 sm:px-8 sm:py-32 lg:px-12">
          <div className="mx-auto max-w-[1400px]">
            <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
              <div><p className="section-kicker">09 / inscrição</p><h2 className="font-display mt-5 max-w-xl text-[clamp(3.6rem,8vw,7.5rem)] font-black uppercase leading-[0.8] tracking-[-0.08em]">faz parte<br /><span className="text-[#f2efe6]">do sistema.</span></h2><p className="mt-8 max-w-sm text-base leading-relaxed text-[#171715]/75">Conta-nos onde estás no teu processo e recebe a informação certa para entrares na próxima turma.</p><div className="mt-8 flex flex-wrap gap-3"><button type="button" onClick={() => scrollToId("programa")} className="button-dark group">ver cronograma <ArrowRight size={14} className="transition-transform duration-200 group-hover:translate-x-1" /></button><a href="#faq" className="button-ghost-dark group">ler perguntas <ArrowUpRight size={14} className="transition-transform duration-200 group-hover:-translate-y-1 group-hover:translate-x-1" /></a></div></div>
              <div className="contact-card">
                <div className="flex items-start justify-between gap-5"><div><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#171715]/55">pedido de informação / 2026</p><h3 className="font-display mt-4 text-3xl font-bold uppercase leading-[0.9] tracking-[-0.04em] sm:text-4xl">vamos começar<br />pela tua pergunta.</h3></div><span className="grid h-11 w-11 place-items-center rounded-full bg-[#171715] text-[#e96b3b]"><Send size={18} className="icon-active" /></span></div>
                {formSubmitted && <div className="form-success" role="status"><span className="grid h-8 w-8 place-items-center rounded-full bg-[#b6c9bb] text-[#171715]"><CircleCheck size={16} className="icon-pulse" /></span><span><strong>Pedido recebido.</strong><small>Enviámos os próximos passos. Até já.</small></span></div>}
                <form onSubmit={handleSubmit} className="mt-9 space-y-5" noValidate>
                  <div className="grid gap-5 sm:grid-cols-2"><div><input aria-label="Nome" name="name" value={formValues.name} onChange={(event) => handleFieldChange("name", event.target.value)} placeholder="o teu nome" className={`contact-input ${formErrors.name ? "contact-input-error" : formValues.name ? "contact-input-valid" : ""}`} />{formErrors.name && <p className="field-error">{formErrors.name}</p>}</div><div><input aria-label="Email" name="email" type="email" value={formValues.email} onChange={(event) => handleFieldChange("email", event.target.value)} placeholder="o-teu@email.com" className={`contact-input ${formErrors.email ? "contact-input-error" : formValues.email ? "contact-input-valid" : ""}`} />{formErrors.email && <p className="field-error">{formErrors.email}</p>}</div></div>
                  <div><select aria-label="Perfil" name="profile" value={formValues.profile} onChange={(event) => handleFieldChange("profile", event.target.value)} className={`contact-input ${formErrors.profile ? "contact-input-error" : "contact-input-valid"}`}><option value="">escolhe o teu perfil</option><option value="arquitetura">sou arquiteto/a</option><option value="estudante">sou estudante</option><option value="equipa">represento uma equipa</option><option value="outro">outro perfil</option></select>{formErrors.profile && <p className="field-error">{formErrors.profile}</p>}</div>
                  <div><textarea aria-label="Mensagem" name="message" rows={3} value={formValues.message} onChange={(event) => handleFieldChange("message", event.target.value)} placeholder="o que queres explorar? (opcional)" className={`contact-input resize-none ${formErrors.message ? "contact-input-error" : formValues.message ? "contact-input-valid" : ""}`} />{formErrors.message && <p className="field-error">{formErrors.message}</p>}</div>
                  <div className="flex flex-col gap-4 border-t border-[#171715]/20 pt-5 sm:flex-row sm:items-center sm:justify-between"><span className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.12em] text-[#171715]/55"><Check size={13} /> resposta em 24h úteis</span><button type="submit" className="submit-cta group">enviar pedido <Send size={15} className="transition-transform duration-200 group-hover:translate-x-1 group-hover:-translate-y-1" /></button></div>
                </form>
              </div>
            </div>
            <div className="mt-20 grid gap-5 border-t border-[#171715]/25 pt-5 font-mono text-[10px] uppercase tracking-[0.14em] sm:grid-cols-3"><div className="flex items-center gap-3"><CalendarDays size={15} className="icon-active" /> sessão 1 · sáb 17 out · sessão 2 · dom 18 out</div><div className="flex items-center gap-3"><Clock3 size={15} className="icon-active" /> 10:00—13:00 WET · 3 h cada</div><div className="flex items-center gap-3"><MapPin size={15} className="icon-active" /> online ao vivo · 6 a 8 lugares</div></div>
          </div>
        </section>
      </main>

      <footer className="bg-[#171715] px-4 py-8 text-[#f2efe6] sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-[1400px] flex-col justify-between gap-8 sm:flex-row sm:items-end"><div><a href="#top" className="font-display text-2xl font-black uppercase tracking-[-0.04em]">IA<span className="text-[#e96b3b]">/</span>ARQ</a><p className="mt-2 font-mono text-[9px] uppercase tracking-[0.13em] text-[#f2efe6]/40">um workshop para arquitetos que não esperam pelo futuro.</p></div><div className="flex items-center gap-6 font-mono text-[10px] uppercase tracking-[0.12em] text-[#f2efe6]/55"><a href="#processo" className="transition-colors hover:text-[#e96b3b]">Processo</a><a href="#faq" className="transition-colors hover:text-[#e96b3b]">FAQ</a><span>© 2026</span></div></div>
      </footer>
      <a href="#inscricao" className="floating-enroll group"><span className="floating-enroll-dot" /><span>inscrever agora</span><ArrowUpRight size={15} className="transition-transform duration-200 group-hover:-translate-y-1 group-hover:translate-x-1" /></a>
    </div>
  );
}
