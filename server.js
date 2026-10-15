/**
 * Ponto de entrada por omissão do preset "Express" da Hostinger.
 *
 * O servidor a sério é compilado para `dist/index.js` pelo script `build`
 * (ver package.json). A Hostinger assume `server.js` como *entry file* quando
 * esse campo fica no default, por isso este ficheiro existe apenas para que o
 * default funcione — não duplica código nenhum.
 *
 * Localmente continua a usar-se `pnpm start` (node dist/index.js).
 */
import "./dist/index.js";
