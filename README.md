# Assistente de Rotina

Aplicativo móvel offline-first para organizar compromissos, tarefas e lembretes. O nome é apenas uma identificação temporária do projeto.

## Tecnologias e estrutura

- Expo SDK 58, React Native 0.88, TypeScript estrito e Expo Router.
- Zustand mantém o estado da interface; um repositório separado salva os dados em AsyncStorage.
- `src/engine` contém regras determinísticas sem dependência de interface ou APIs externas. O planejador de notificações usa uma porta injetável para ser testado com um agendador falso.
- `src/services` integra as regras com notificações locais do sistema e abertura de mapas.
- `src/app` contém as rotas Hoje, Agenda, Ajustes, formulário e detalhes.

Essa divisão mantém armazenamento, regras e apresentação separados sem criar camadas de backend ou sincronização que a primeira versão não usa.

## Requisitos

- Node.js 24.3 ou superior (ou Node.js 22.13 ou superior).
- npm.
- Android Studio e Android SDK para compilar no Android.
- macOS e Xcode para compilar localmente no iOS. Em Windows, use uma development build iOS hospedada pelo EAS Build ou compile em um Mac.

O Expo SDK 58 foi lançado em outubro de 2026. Enquanto o Expo Go compatível com SDK 58 não estiver disponível nas lojas, use uma development build.

## Instalação e execução

```bash
npm install
npx expo install --fix
npm run start
```

### Testar no navegador

O endereço exibido após `npm run start` é o servidor de desenvolvimento do Expo. Para abrir a interface web, rode:

```bash
npm run web
```

O Expo abre o navegador automaticamente. Se a porta 8081 já estiver ocupada, ele escolherá outra porta; use o endereço informado no terminal. A versão web serve para conferir as telas e os fluxos básicos. Notificações locais devem ser testadas em uma development build Android ou iOS.

### Testar no Android

Com Android Studio, Android SDK e um emulador aberto (ou um aparelho configurado), rode:

```bash
npm run android
```

Na primeira execução, o Expo compila e instala o aplicativo. Para abrir novamente o servidor depois, use `npm run start` e abra o aplicativo instalado. O Expo Go das lojas ainda não é compatível com este SDK 58; use uma development build.

Para criar e abrir uma development build Android local (requer Android Studio, SDK e dispositivo/emulador configurado):

```bash
npx expo run:android
npm run start
```

Para iOS em um Mac com Xcode:

```bash
npx expo run:ios
npm run start
```

Também é possível compilar uma development build pelo EAS após instalar e configurar a CLI `eas`:

```bash
npx eas-cli build --profile development --platform android
npx eas-cli build --profile development --platform ios
```

Depois de instalar a build no aparelho, execute `npm run start` e abra o aplicativo instalado. Notificações locais são compatíveis com Expo Go, mas a versão SDK 58 do Expo Go ainda pode não estar disponível para instalação; a development build evita essa dependência. Para distribuir o aplicativo, gere uma build de produção.

## Verificações

```bash
npm run typecheck
npm run lint
npm test
npx expo-doctor
```

Os testes usam o executor nativo `node:test` e verificam cálculo da saída, conflitos, resumo e estado vazio, validações de formulários, permissão negada, tarefas vencidas, silêncio, respeito à preferência global, deduplicação, reagendamento, cancelamento e operações/persistência do repositório. A interface e a entrega real de notificações precisam ser conferidas em uma development build instalada.

## Funcionalidades incluídas

- Painel diário com saudação, contagem real, próximo item, conflitos e até três prioridades.
- Agenda dos próximos sete dias ou filtro por data, com filtro de tarefas pendentes/concluídas.
- Cadastro, edição e exclusão de compromissos; criação, edição, conclusão e exclusão de tarefas e lembretes.
- Persistência local automática e recuperação segura caso os dados salvos estejam inválidos.
- Recomendações de saída com cálculo local. Sem término informado, conflitos e status usam uma duração padrão estimada de 60 minutos.
- Novas tarefas usam a antecedência padrão configurada; prazos sem horário usam o início preferido do dia.
- Avisos locais de saída e de prazos, identificadores persistidos, cancelamento ao excluir/concluir, deduplicação por regra e reagendamento de itens alterados.
- Horário de silêncio e exceção individual para avisos que a pessoa quer manter.
- Permissão solicitada ao habilitar os avisos ou testar uma notificação; abertura de pesquisa de endereço em aplicativo de mapas.
- Apagar dados locais mediante confirmação.

## Limitações conhecidas

- Os dados ficam apenas no aparelho e não são criptografados pelo AsyncStorage. Não há login, backup ou sincronização.
- A entrega no horário depende das permissões e políticas de bateria do sistema. Atrasos podem ocorrer; o aplicativo não executa um serviço de monitoramento em segundo plano.
- Compromissos sem horário final contam como 60 minutos somente para estimar conflitos e status.
- Tempo de deslocamento e margem são inseridos pela pessoa. Não há trânsito, clima ou localização em tempo real.
- A rota usa uma pesquisa de endereço em Google Maps por URL universal. O dispositivo pode abrir outro aplicativo compatível ou o navegador; não há chave de API.
- O horário de silêncio impede a programação de avisos comuns cujo disparo cair nesse intervalo. Um item com a opção explícita de manter o aviso ignora esse silêncio.
- Integrações com calendários, comandos de voz, IA e sincronização futura não estão expostas como recursos ativos.

## Privacidade

Nenhum serviço remoto recebe a rotina. Abrir uma rota envia o destino ao aplicativo/site de mapas escolhido. Os testes e regras podem ser executados sem conexão à internet depois da instalação das dependências.
