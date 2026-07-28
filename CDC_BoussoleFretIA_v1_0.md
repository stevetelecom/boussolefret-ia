**FLYSOFT ENGINEERING SAS**

Direction Technique --- Yaoundé, Cameroun

**CAHIER DES CHARGES**

**BoussoleFret IA**

Assistant intelligent de conformité et de connaissance réglementaire
pour le fret CEMAC

*Version 1.0 --- Projet de stage, module RAG complémentaire à
FretCorridor v3.0*

*Livraison native sur trois plateformes clientes (Web, Mobile, Desktop)
adossées à un backend unique en Go*

  -----------------------------------------------------------------------
  **Champ**           **Valeur**
  ------------------- ---------------------------------------------------
  Référence           FSE-CDC-BOUSSOLEFRET-2026-001

  Version             1.0 (projet pour décision) --- dérivé de la note de
                      synthèse du 22 juillet 2026

  Date                27 juillet 2026

  Statut              À VALIDER --- soumis à un jalon Go / No-Go (cf.
                      §13)

  Classification      Confidentiel --- diffusion restreinte

  Auteur              Direction Technique, Flysoft Engineering SAS

  Document de         CDC FretCorridor v3.0
  référence           (FSE-CDC-FRETCORRIDOR-2026-003) --- même
                      méthodologie, périmètre distinct et complémentaire
  -----------------------------------------------------------------------

**Avertissement**

Ce document décline, pour **BoussoleFret IA**, la même discipline
méthodologique que le CDC **FretCorridor v3.0** (réf.
FSE-CDC-FRETCORRIDOR-2026-003) : ingénierie critique, garde-fous
explicites, phasage discipliné. Les deux produits partagent le marché
(bureaux de fret, grands comptes) et une partie de la pile technique,
mais BoussoleFret IA n\'est **ni une extension du matching, ni un canal
de financement** : c\'est un assistant de connaissance (RAG) qui répond
à des questions réglementaires et signale des documents atypiques, sans
jamais porter de flux financier ni de risque de crédit.

Trois garde-fous non négociables encadrent ce projet, à l\'image des
trois garde-fous de FretCorridor : (1) **aucune réponse sans source
citée** --- le système doit s\'abstenir plutôt qu\'halluciner ; (2)
**aucun flux financier ni matching** porté par le produit ---
BoussoleFret IA reste un outil de connaissance, jamais une marketplace ;
(3) **gouvernance stricte du corpus** --- chaque bureau de fret
administre et valide ses propres textes réglementaires, avec traçabilité
complète des versions et des sources.

**Note méthodologique**

Posture. Le présent CDC assume que la valeur du produit repose
intégralement sur la **qualité et la fraîcheur du corpus
réglementaire**, et non sur la sophistication du modèle de langage. Un
LLM performant sur un corpus pauvre ou obsolète produit des réponses
plausibles mais fausses --- le risque numéro un du projet (cf. R1, §17).
Toute décision d\'architecture est prise pour minimiser ce risque avant
d\'optimiser la performance perçue.

**Historique des versions**

  ---------------------------------------------------------------------------------
  **Version**   **Date**     **Objet**                                 **Auteur**
  ------------- ------------ ----------------------------------------- ------------
  0.1           22/07/2026   Note de synthèse --- principe,            Dir.
                             positionnement, cas d\'usage              Technique

  1.0           27/07/2026   Cahier des charges complet --- exigences  Dir.
                             fonctionnelles/non fonctionnelles,        Technique
                             architecture, phasage, trois plateformes  
                             clientes (Web/Mobile/Desktop) sur backend 
                             Go                                        
  ---------------------------------------------------------------------------------

**Sommaire**

-   1\. Synthèse exécutive

-   2\. Objet et périmètre du document

-   3\. Rapport avec FretCorridor : complémentaire, pas concurrent

-   4\. Cas d\'usage concrets

-   5\. Repositionnement et axes de revenu

-   6\. Périmètre fonctionnel

-   7\. Exigences fonctionnelles

-   8\. Exigences non fonctionnelles

-   9\. Architecture technique cible (Web · Mobile · Desktop · Backend
    Go)

-   10\. Modèle de données

-   11\. Intégrations externes

-   12\. Sécurité, conformité et gouvernance des données

-   13\. Plan de phasage et jalons Go / No-Go

-   14\. Charge et budget indicatifs

-   15\. Hypothèses et dépendances

-   16\. Critères d\'acceptation et indicateurs

-   17\. Registre des risques

-   18\. Sources et références

-   19\. Glossaire

**1. Synthèse exécutive**

Le principe, en une phrase. Un assistant qui répond en langage naturel,
en quelques secondes et **avec ses sources**, aux questions
réglementaires du fret CEMAC (LVO/LVI, quota 60/40, conformité d\'un
document) --- sans matching camion-fret et sans porter de crédit.

Technique. **RAG (Retrieval-Augmented Generation)** --- les textes
réglementaires et documents de mission sont vectorisés (embeddings),
indexés dans une base vectorielle (pgvector), puis interrogés par
similarité pour donner au LLM le contexte exact d\'une réponse fiable et
vérifiable. La même logique de similarité détecte les documents
atypiques (anomalies) par écart au corpus habituel.

Ce que ce CDC ajoute à la note de synthèse du 22 juillet 2026 : la
déclinaison complète en exigences fonctionnelles et non fonctionnelles,
l\'architecture technique cible, et surtout la spécification des **trois
plateformes clientes --- Web, Mobile, Desktop** --- toutes adossées à un
**backend unique en Go**, condition pour que le moteur RAG, les sources
citées et le comportement du produit restent identiques quel que soit le
canal d\'accès.

Conditionnalité. Comme pour FretCorridor, aucun développement de portée
avant la levée des verrous de la Phase 0 : disponibilité effective d\'un
corpus réglementaire exploitable, accord d\'au moins un bureau de fret
pour le fournir, et confirmation du budget d\'appel à un LLM externe
(cf. §13 et §15).

**2. Objet et périmètre du document**

Ce document spécifie **BoussoleFret IA**, un assistant intelligent de
conformité et de connaissance réglementaire pour le fret CEMAC, proposé
en tant que projet de stage en réponse au CDC FretCorridor v3.0. Il
couvre le périmètre fonctionnel, les exigences non fonctionnelles,
l\'architecture technique cible sur trois plateformes clientes (Web,
Mobile, Desktop) et un backend Go partagé, le modèle de données, la
sécurité, le phasage et les risques.

**Hors périmètre :** matching camion-fret, financement carburant, tout
portage de crédit ou de flux financier, business plan détaillé, avis
juridique formel par pays. Ces éléments relèvent exclusivement de
FretCorridor ou de prérequis de Phase 0.

**Public visé :** sponsor, Direction Technique, bureaux de fret
pressentis (BGFT, puis BNFT/BARC), responsables conformité des grands
comptes (cimentiers, brasseries, multinationales).

**3. Rapport avec FretCorridor : complémentaire, pas concurrent**

Même marché et mêmes clients (bureaux de fret, grands comptes), problème
différent : FretCorridor **cadre** la conformité (exigences EF-CMP-03,
EF-INT-05 du CDC v3.0) sans la résoudre ; BoussoleFret IA la **résout**,
sans jamais toucher au matching, au financement ni à la trésorerie.

  ------------------------------------------------------------------------
  **Critère**      **FretCorridor v3.0**     **BoussoleFret IA**
  ---------------- ------------------------- -----------------------------
  Nature           Plateforme réseau         Assistant de connaissance
                   (marketplace, matching)   (RAG)

  Risque financier Élevé (financement        Nul --- aucun flux financier
                   carburant)                porté

  Vente            Licence bureaux + SaaS    SaaS additionnel, mêmes
                   grands comptes            clients, ou module intégré

  Donnée sensible  Géolocalisation en zone   Textes réglementaires +
                   de conflit                documents de mission (pas de
                                             position GPS)

  Dépendance       Dispositifs d\'État       Disponibilité et coût de
  externe critique (Landfreightis/Sigfret)   l\'API LLM externe
  ------------------------------------------------------------------------

*Tableau 1 --- Positionnement comparé FretCorridor / BoussoleFret IA.*

**4. Cas d\'usage concrets**

-   Un agent de bureau de fret pose une question réglementaire par
    WhatsApp ou l\'application mobile et reçoit, en quelques secondes,
    une réponse sourcée en français ou en anglais.

-   Un chargeur (cimentier, brasserie) importe un lot de documents de
    transport via l\'application web ; le système signale par similarité
    les documents atypiques pour un contrôle humain ciblé.

-   Un responsable conformité consulte, depuis le back-office desktop,
    les questions les plus posées et les zones de flou réglementaire, et
    enrichit la base de connaissance.

-   Un nouveau bureau de fret (BNFT, BARC) alimente le système avec ses
    propres textes réglementaires via l\'interface desktop
    d\'administration ; l\'assistant s\'adapte sans réécriture de code,
    par simple ajout de corpus.

-   Un chauffeur ou agent terrain sans connexion stable pose une
    question depuis l\'application mobile en mode dégradé ; la question
    est mise en file et la réponse sourcée arrive dès le rétablissement
    du réseau.

**5. Repositionnement et axes de revenu**

À l\'image du repositionnement B2B2G multi-bureaux de FretCorridor,
BoussoleFret IA se vend selon trois axes, sans jamais introduire de
risque de crédit.

  -----------------------------------------------------------------------------------
  **Axe**           **Description**                    **Capital / **Séquencement**
                                                       risque**    
  ----------------- ---------------------------------- ----------- ------------------
  1 --- SaaS        Abonnement par bureau de fret      Faible      MVP --- Phase 1
  conformité par    (BGFT, puis BNFT/BARC) pour                    
  bureau (ANCRE)    l\'assistant réglementaire,                    
                    multi-tenant, corpus propre à                  
                    chaque bureau.                                 

  2 --- SaaS grands Abonnement pour chargeurs          Faible      Phase 1--2
  comptes           (cimentiers, brasseries,                       
  (DIVERSIF.)       multinationales) : questions                   
                    réglementaires + détection                     
                    d\'anomalies documentaires.                    

  3 --- Module      Vente comme module additionnel du  Faible      Phase 2--3,
  intégré à         portail partenaire FretCorridor,               optionnel
  FretCorridor      en marque blanche, à la demande                
  (OPTION)          des bureaux déjà clients.                      
  -----------------------------------------------------------------------------------

Aucun de ces axes ne porte de risque de trésorerie ou de crédit : c\'est
la différence structurante avec l\'axe 3 (financement carburant) de
FretCorridor, volontairement absente ici.

**6. Périmètre fonctionnel**

  -----------------------------------------------------------------------
  **Inclus dans le MVP**              **Exclu du MVP (hors périmètre
                                      produit)**
  ----------------------------------- -----------------------------------
  Réponse en langage naturel FR/EN à  Matching camion-fret (relève
  une question réglementaire, avec    exclusivement de FretCorridor)
  sources citées                      

  Vectorisation et indexation du      Financement carburant ou tout
  corpus réglementaire (embeddings,   portage de crédit
  pgvector)                           

  Détection de documents atypiques    Émission officielle des LVO/LVI
  par similarité au corpus            (régalien, hors périmètre)

  Trois clients natifs : Web (PWA),   Génération de contenu réglementaire
  Mobile (Flutter, offline-first),    nouveau (le système ne rédige pas
  Desktop (administration corpus)     de règles, il les explique)

  Canal WhatsApp en mode pull         Décision automatisée de conformité
  (fenêtre de service 24 h)           sans validation humaine sur les cas
                                      signalés en anomalie

  Administration multi-bureau du      Multi-continents / hors CEMAC
  corpus, isolation stricte par       (après preuve régionale)
  tenant                              

  Journal d\'audit des                ---
  questions/réponses et des décisions 
  sur anomalies                       
  -----------------------------------------------------------------------

**7. Exigences fonctionnelles**

Convention. Identifiant + priorité MoSCoW (M = Must, S = Should, C =
Could). Les modules **WEB, MOB, DSK** spécifient les exigences propres à
chaque plateforme cliente ; les modules **COR, RAG, ANO, CNL, ADM, INT**
sont transverses et portés par le backend Go, consommés identiquement
par les trois clients.

**7.1 Module Ingestion & Corpus (COR)**

  -----------------------------------------------------------------------------------
  **Identifiant**   **Exigence**                                       **Priorité**
  ----------------- -------------------------------------------------- --------------
  EF-COR-01         Le système doit vectoriser (embeddings) les textes M
                    réglementaires et documents de mission, et les     
                    indexer dans une base vectorielle (pgvector), par  
                    corpus et par bureau.                              

  EF-COR-02         Le système doit permettre l\'ajout d\'un nouveau   M
                    corpus (nouveau bureau, nouveau pays) par simple   
                    import, sans réécriture de code.                   

  EF-COR-03         Le système doit versionner les textes              M
                    réglementaires (traçabilité des mises à jour, date 
                    d\'effet, texte remplacé).                         

  EF-COR-04         Le système devrait supporter l\'ingestion          S
                    multi-format (PDF, DOCX, images scannées via OCR). 

  EF-COR-05         Le système devrait permettre une ré-indexation     S
                    incrémentale sans interruption de service.         
  -----------------------------------------------------------------------------------

**7.2 Module RAG / Moteur de réponse (RAG)**

  -----------------------------------------------------------------------------------
  **Identifiant**   **Exigence**                                       **Priorité**
  ----------------- -------------------------------------------------- --------------
  EF-RAG-01         Le système doit répondre en langage naturel        M
                    (FR/EN) à une question réglementaire, avec         
                    citation exacte des sources (texte, article,       
                    corpus).                                           

  EF-RAG-02         Le système doit effectuer une recherche par        M
                    similarité (embeddings) pour fournir au LLM le     
                    contexte exact avant génération de la réponse.     

  EF-RAG-03         Le système doit détecter l\'absence de source      M
                    fiable et répondre par une abstention explicite    
                    plutôt que par une réponse non sourcée --- jamais  
                    d\'hallucination silencieuse.                      

  EF-RAG-04         Le système doit historiser chaque question/réponse M
                    avec les sources citées, à des fins d\'audit et    
                    d\'amélioration continue.                          

  EF-RAG-05         Le système devrait permettre un retour utilisateur S
                    (pertinent / non pertinent) pour enrichir le       
                    corpus et la pertinence future.                    

  EF-RAG-06         Le système devrait proposer des questions          C
                    similaires déjà traitées, pour réduire la charge   
                    sur le LLM externe.                                
  -----------------------------------------------------------------------------------

**7.3 Module Détection d\'anomalies documentaires (ANO)**

  -----------------------------------------------------------------------------------
  **Identifiant**   **Exigence**                                       **Priorité**
  ----------------- -------------------------------------------------- --------------
  EF-ANO-01         Le système doit analyser un lot de documents de    M
                    transport importés et détecter les documents       
                    atypiques par écart de similarité au corpus        
                    habituel.                                          

  EF-ANO-02         Le système doit classer le niveau de risque        M
                    d\'anomalie (faible / moyen / élevé) et alimenter  
                    une file de contrôle humain priorisée.             

  EF-ANO-03         Le système devrait tracer la décision humaine sur  S
                    chaque anomalie signalée (validée / rejetée /      
                    escaladée).                                        

  EF-ANO-04         Le système devrait permettre le réglage, par       C
                    bureau, du seuil de sensibilité de détection.      
  -----------------------------------------------------------------------------------

**7.4 Module Canal & Notifications (CNL)**

  -----------------------------------------------------------------------------------
  **Identifiant**   **Exigence**                                       **Priorité**
  ----------------- -------------------------------------------------- --------------
  EF-CNL-01         Le système doit permettre de poser une question    M
                    via WhatsApp (mode pull, fenêtre de service 24 h   
                    gratuite) et de recevoir une réponse sourcée.      

  EF-CNL-02         Le système doit répondre dans la langue de la      M
                    question, ou selon la préférence explicite de      
                    l\'utilisateur (FR/EN).                            

  EF-CNL-03         Le système devrait replier automatiquement vers    S
                    l\'app mobile/web si le canal WhatsApp échoue ou   
                    dépasse le budget de messages.                     
  -----------------------------------------------------------------------------------

**7.5 Module Web (WEB) --- bureaux de fret, grands comptes, chargeurs**

*Client : Angular (PWA), consommant l\'API Go via passerelle/BFF.*

  -----------------------------------------------------------------------------------
  **Identifiant**   **Exigence**                                       **Priorité**
  ----------------- -------------------------------------------------- --------------
  EF-WEB-01         L\'interface web doit permettre de poser une       M
                    question, consulter l\'historique des échanges et  
                    les sources citées.                                

  EF-WEB-02         L\'interface web doit permettre l\'import par lot  M
                    de documents de transport (chargeur) et la         
                    consultation des anomalies signalées.              

  EF-WEB-03         L\'interface web doit offrir un back-office pour   M
                    un responsable conformité : questions les plus     
                    posées, zones de flou réglementaire,               
                    enrichissement du corpus.                          

  EF-WEB-04         L\'interface web devrait fournir des tableaux de   S
                    bord et exports (PDF/Excel) des questions,         
                    anomalies et taux de couverture du corpus.         

  EF-WEB-05         L\'interface web doit se dégrader gracieusement    S
                    sur connexion faible (mise en cache PWA des        
                    réponses et pages consultées).                     
  -----------------------------------------------------------------------------------

**7.6 Module Mobile (MOB) --- agents terrain, chauffeurs, chargeurs**

*Client : Flutter (iOS/Android), offline-first, même API Go que le
client Web.*

  -----------------------------------------------------------------------------------
  **Identifiant**   **Exigence**                                       **Priorité**
  ----------------- -------------------------------------------------- --------------
  EF-MOB-01         L\'application mobile doit permettre de poser une  M
                    question en langage naturel et de recevoir une     
                    réponse sourcée, y compris en conditions de        
                    connexion instable.                                

  EF-MOB-02         L\'application mobile doit permettre la capture    M
                    photo d\'un document de transport et sa soumission 
                    pour analyse d\'anomalie.                          

  EF-MOB-03         L\'application mobile doit fonctionner en mode     M
                    offline-first : questions posées hors ligne mises  
                    en file locale, réponse délivrée dès               
                    rétablissement du réseau.                          

  EF-MOB-04         L\'application mobile devrait notifier (push) les  S
                    réponses différées et les alertes d\'anomalie.     

  EF-MOB-05         L\'application mobile doit s\'authentifier selon   M
                    le même schéma RBAC que les autres clients         
                    (compatible avec celui de FretCorridor si          
                    intégré).                                          
  -----------------------------------------------------------------------------------

**7.7 Module Desktop (DSK) --- back-office conformité, gouvernance du
corpus**

*Client : application desktop (packaging léger du client Angular, ex.
Tauri, ou Electron), même API Go --- pas de logique métier dupliquée.*

  -----------------------------------------------------------------------------------
  **Identifiant**   **Exigence**                                       **Priorité**
  ----------------- -------------------------------------------------- --------------
  EF-DSK-01         L\'application desktop doit permettre              M
                    l\'administration du corpus : ajout, retrait et    
                    versionning des textes réglementaires par bureau.  

  EF-DSK-02         L\'application desktop doit offrir une supervision M
                    analytique : historique complet des                
                    questions/réponses, zones de flou (questions sans  
                    réponse fiable), taux de couverture par            
                    corpus/bureau.                                     

  EF-DSK-03         L\'application desktop doit permettre la           M
                    validation humaine des documents signalés en       
                    anomalie, avec annotation et décision.             

  EF-DSK-04         L\'application desktop devrait permettre l\'export S
                    et la sauvegarde du corpus et des journaux         
                    d\'audit.                                          

  EF-DSK-05         L\'application desktop doit gérer le multi-bureau  M
                    : chaque bureau administre son propre corpus, avec 
                    isolation stricte des données.                     

  EF-DSK-06         L\'application desktop devrait fonctionner en      S
                    réseau instable typique d\'un back-office          
                    régional, avec mise en cache locale des vues       
                    fréquentes.                                        
  -----------------------------------------------------------------------------------

**7.8 Module Administration & Gouvernance (ADM)**

  -----------------------------------------------------------------------------------
  **Identifiant**   **Exigence**                                       **Priorité**
  ----------------- -------------------------------------------------- --------------
  EF-ADM-01         Le système doit gérer les profils Administrateur   M
                    corpus, Responsable conformité, Agent, Chargeur,   
                    avec RBAC par tenant.                              

  EF-ADM-02         Le système doit journaliser (append-only) toute    M
                    modification du corpus et toute décision sur une   
                    anomalie signalée.                                 

  EF-ADM-03         Le système devrait permettre la délégation de      S
                    droits d\'administration du corpus à un référent   
                    par bureau, sans accès aux autres tenants.         
  -----------------------------------------------------------------------------------

**7.9 Module Interopérabilité avec FretCorridor (INT)**

  -----------------------------------------------------------------------------------
  **Identifiant**   **Exigence**                                       **Priorité**
  ----------------- -------------------------------------------------- --------------
  EF-INT-01         Le système doit garantir une valeur autonome sans  M
                    intégration à FretCorridor : BoussoleFret IA       
                    fonctionne en produit indépendant.                 

  EF-INT-02         Le système doit pouvoir être intégré au portail    M
                    partenaire FretCorridor (marque blanche) ou vendu  
                    en SaaS additionnel autonome, sans réécriture.     

  EF-INT-03         Le système devrait partager, si les deux produits  S
                    sont déployés chez le même bureau, l\'identité     
                    tenant et le RBAC avec FretCorridor pour éviter    
                    une double authentification.                       

  EF-INT-04         Le système pourrait exposer une API de             C
                    rapprochement mission ↔ pièce réglementaire pour   
                    alimenter le module CMP de FretCorridor            
                    (EF-CMP-02), si les deux produits sont             
                    co-déployés.                                       
  -----------------------------------------------------------------------------------

**8. Exigences non fonctionnelles**

**8.1 Performance, connectivité, résilience**

  -----------------------------------------------------------------------------------
  **Identifiant**   **Exigence**                                       **Priorité**
  ----------------- -------------------------------------------------- --------------
  ENF-PRF-01        Une question simple doit obtenir une réponse en    M
                    moins de 5 s en P95 sur réseau 3G (hors latence de 
                    l\'API LLM externe, mesurée séparément).           

  ENF-OFF-01        Le client mobile doit être offline-first : capture M
                    locale des questions, synchronisation idempotente  
                    au retour réseau.                                  

  ENF-DIS-01        Le backend doit garantir une disponibilité ≥ 99 %  M
                    ; aucune perte de question en file (files          
                    persistantes) ; RPO ≤ 24 h, RTO ≤ 4 h.             
  -----------------------------------------------------------------------------------

**8.2 Sécurité et gouvernance des données**

  -----------------------------------------------------------------------------------
  **Identifiant**   **Exigence**                                       **Priorité**
  ----------------- -------------------------------------------------- --------------
  ENF-SEC-01        Le système doit chiffrer les données en transit    M
                    (TLS) et au repos ; authentification forte pour le 
                    client desktop et les rôles d\'administration.     

  ENF-SEC-02        Le système doit maintenir un journal d\'audit      M
                    inviolable (append-only) pour toute modification   
                    du corpus et toute décision sur une anomalie.      

  ENF-SEC-03        Le système ne doit traiter aucune donnée           M
                    financière, de crédit ou de géolocalisation en     
                    temps réel --- hors périmètre par conception.      

  ENF-SEC-04        Le système devrait anonymiser ou pseudonymiser les S
                    données personnelles présentes dans les documents  
                    importés avant indexation, lorsque non nécessaires 
                    à la réponse.                                      
  -----------------------------------------------------------------------------------

**8.3 Multi-tenant, multi-pays**

  -----------------------------------------------------------------------------------
  **Identifiant**   **Exigence**                                       **Priorité**
  ----------------- -------------------------------------------------- --------------
  ENF-MUL-01        Le système doit isoler strictement les corpus et   M
                    les données entre tenants (bureaux) et entre pays  
                    ; aucune fuite inter-tenant, vérifiée par tests    
                    automatisés.                                       

  ENF-RES-01        Le système doit pouvoir héberger les données d\'un M
                    tenant public sur une infrastructure dédiée ou     
                    nationale si la contractualisation l\'exige.       
  -----------------------------------------------------------------------------------

**8.4 Multi-plateforme (Web · Mobile · Desktop) et backend Go**

Cette section est le point central demandé pour ce CDC : les trois
clients doivent constituer des **vues différentes d\'un même produit**,
jamais trois produits distincts.

  -----------------------------------------------------------------------------------
  **Identifiant**   **Exigence**                                       **Priorité**
  ----------------- -------------------------------------------------- --------------
  ENF-PLT-01        Le backend Go doit exposer une API unique (REST,   M
                    versionnée) consommée de façon identique par les   
                    trois clients, sans logique métier dupliquée côté  
                    client (validation, calcul de pertinence,          
                    formatage des sources restent côté serveur).       

  ENF-PLT-02        Le moteur RAG, les sources citées et le            M
                    comportement d\'abstention doivent être            
                    strictement identiques quel que soit le canal      
                    d\'accès (WhatsApp, Web, Mobile, Desktop).         

  ENF-PLT-03        Le client desktop doit être un empaquetage léger   M
                    du client Web (même code Angular, wrapper natif)   
                    afin d\'éviter une troisième base de code à        
                    maintenir.                                         

  ENF-PLT-04        Le client mobile (Flutter) et le backend doivent   M
                    partager un schéma d\'échange unique (contrats     
                    d\'API, DTO) versionné et testé en intégration     
                    continue.                                          

  ENF-PLT-05        Toute évolution du moteur RAG ou du modèle de      S
                    données doit être déployable sans changement       
                    obligatoire des trois clients (rétrocompatibilité  
                    de l\'API).                                        
  -----------------------------------------------------------------------------------

**8.5 Internationalisation et exploitation**

  -----------------------------------------------------------------------------------
  **Identifiant**   **Exigence**                                       **Priorité**
  ----------------- -------------------------------------------------- --------------
  ENF-I18N-01       Les interfaces et notifications doivent être       M
                    bilingues FR/EN sur les trois plateformes,         
                    configurables par bureau.                          

  ENF-OPS-01        Le déploiement doit être reproductible (IaC), avec M
                    environnements séparés et CI/CD incluant tests     
                    automatisés pour le backend Go et les trois        
                    clients.                                           
  -----------------------------------------------------------------------------------

**9. Architecture technique cible (Web · Mobile · Desktop · Backend
Go)**

**9.1 Principes**

L\'architecture reprend la stack validée par FretCorridor pour limiter
le risque technique et faciliter une intégration future : services
**Go** (Clean Architecture), **PostgreSQL/pgvector** pour l\'indexation
vectorielle du corpus, **Redis** pour le cache des réponses fréquentes
et le rate-limiting, **MinIO** pour le stockage des documents sources,
**NATS/Kafka** pour les événements d\'ingestion et de ré-indexation. Un
service dédié **RAG** orchestre la recherche par similarité et l\'appel
à un LLM externe via passerelle.

**9.2 Composants par plateforme**

  -----------------------------------------------------------------------
  **Composant**      **Technologie**            **Rôle**
  ------------------ -------------------------- -------------------------
  Client Web         Angular (PWA)              Bureaux de fret, grands
                                                comptes, chargeurs ---
                                                questions, import
                                                documentaire, back-office
                                                conformité

  Client Mobile      Flutter (iOS/Android),     Agents terrain,
                     offline-first              chauffeurs --- questions
                                                en langage naturel,
                                                capture photo de
                                                documents

  Client Desktop     Empaquetage natif du       Administration du corpus,
                     client Angular (Tauri ou   gouvernance multi-bureau,
                     Electron)                  supervision analytique

  Passerelle / BFF   Go                         Authentification,
                                                rate-limit, idempotence,
                                                agrégation des appels
                                                vers les services métier

  Service RAG        Go                         Recherche par similarité
                                                (pgvector), construction
                                                du contexte, appel LLM,
                                                citation des sources

  Service Ingestion  Go                         Vectorisation,
  (COR)                                         versionning et indexation
                                                du corpus réglementaire

  Service Anomalies  Go                         Analyse de similarité
  (ANO)                                         documentaire, scoring de
                                                risque, file de contrôle

  Base vectorielle   PostgreSQL + pgvector      Stockage des embeddings
                                                et recherche par
                                                similarité

  Cache              Redis                      Réponses fréquentes,
                                                sessions, rate-limit
                                                WhatsApp

  Stockage           MinIO                      Documents sources, textes
  documentaire                                  réglementaires, pièces
                                                jointes

  Bus d\'événements  NATS / Kafka               Ingestion asynchrone,
                                                ré-indexation,
                                                notifications

  LLM externe        API tierce (passerelle Go  Génération de la réponse
                     dédiée)                    en langage naturel à
                                                partir du contexte fourni
                                                par le RAG
  -----------------------------------------------------------------------

*Tableau 2 --- Composants d\'architecture par plateforme et service
backend.*

**9.3 Choix structurants**

-   API Go unique consommée identiquement par les trois clients : aucune
    règle métier (pertinence, seuils d\'anomalie, formatage des sources)
    ne doit être dupliquée côté client.

-   Réutilisation du client Web pour le Desktop (packaging natif) plutôt
    qu\'un troisième front dédié, pour limiter la charge de maintenance
    à deux bases de code (Angular + Flutter).

-   Multi-tenant dès l\'origine : chaque bureau dispose d\'un corpus
    isolé, condition pour la réplication à BNFT, BARC puis d\'autres
    bureaux régionaux.

-   Abstention explicite plutôt qu\'hallucination : le service RAG doit
    pouvoir refuser de répondre quand la similarité au corpus est
    insuffisante.

**9.4 Anti-patterns à proscrire**

-   Dupliquer la logique de calcul de pertinence ou de seuil d\'anomalie
    dans un client (Web, Mobile ou Desktop) plutôt que dans le backend
    Go.

-   Développer un troisième front totalement indépendant pour le
    Desktop, au lieu de réutiliser le client Web.

-   Répondre sans source citée, ou reformuler un texte réglementaire de
    mémoire plutôt que par recherche dans le corpus indexé.

-   Mutualiser les corpus entre tenants (bureaux) sous prétexte de
    simplicité d\'indexation.

**10. Modèle de données (entités clés)**

  -----------------------------------------------------------------------------
  **Entité**           **Description**                   **Relations clés**
  -------------------- --------------------------------- ----------------------
  Bureau (tenant)      Bureau de fret ou grand compte    1-n Corpus ; 1-n
                       client (BGFT, BNFT, BARC,         Utilisateur
                       chargeur)                         

  Corpus               Ensemble de textes réglementaires n-1 Bureau ; 1-n
                       vectorisés propre à un bureau     TexteReglementaire

  TexteReglementaire   Texte source (article,            n-1 Corpus ; 1-n
                       circulaire, barème), versionné    Embedding

  Embedding            Vecteur associé à un fragment de  n-1 TexteReglementaire
                       texte, pour la recherche par      
                       similarité                        

  Question             Question posée par un             n-1 Utilisateur ; 1-n
                       utilisateur, quel que soit le     SourceCitee
                       canal                             

  Reponse              Réponse générée, ou abstention    1-1 Question ; 1-n
                       explicite                         SourceCitee

  SourceCitee          Référence exacte au               n-1 Reponse ; n-1
                       TexteReglementaire utilisé pour   TexteReglementaire
                       une réponse                       

  DocumentImporte      Document de transport soumis pour n-1 Bureau ; 0-1
                       analyse d\'anomalie               AnomalieDetectee

  AnomalieDetectee     Écart de similarité signalé, avec n-1 DocumentImporte ;
                       niveau de risque                  0-1 DecisionHumaine

  DecisionHumaine      Validation, rejet ou escalade     n-1 AnomalieDetectee ;
                       d\'une anomalie par un            n-1 Utilisateur
                       responsable conformité            

  Utilisateur / Acteur Administrateur corpus,            n-1 Bureau
                       responsable conformité, agent,    
                       chargeur                          

  JournalAudit         Trace inviolable des actions      réf. Bureau +
                       sensibles (corpus, décisions)     Utilisateur +
                                                         ressource
  -----------------------------------------------------------------------------

**11. Intégrations externes**

  ------------------------------------------------------------------------
  **Intégration**   **Rôle**                        **Points de
                                                    vigilance**
  ----------------- ------------------------------- ----------------------
  API LLM externe   Génération de la réponse en     Coût par appel,
                    langage naturel à partir du     disponibilité,
                    contexte RAG                    souveraineté des
                                                    données si hébergement
                                                    hors CEMAC

  WhatsApp (BSP)    Canal low-tech, mode pull       Tarif par message
                                                    (depuis le 01/07/2025)
                                                    ; fenêtre de service
                                                    24 h gratuite

  Service OCR       Extraction de texte des         Qualité variable des
                    documents scannés à             scans, langues
                    l\'ingestion du corpus          multiples

  FretCorridor      Portail partenaire, identité    Intégration
  (optionnel)       tenant partagée, rapprochement  optionnelle, ne doit
                    mission ↔ pièce réglementaire   jamais bloquer la
                                                    valeur autonome du
                                                    produit
  ------------------------------------------------------------------------

**12. Sécurité, conformité et gouvernance des données**

**12.1 Aucun flux financier ni matching**

Par construction, BoussoleFret IA ne traite ni crédit, ni paiement, ni
affectation camion-fret. Ce garde-fou, hérité de la logique
FretCorridor, doit être vérifié dans chaque revue d\'architecture :
toute fonctionnalité qui s\'en approcherait doit être orientée vers
FretCorridor plutôt qu\'ajoutée ici.

**12.2 Fiabilité des réponses**

Le risque principal n\'est pas la sécurité applicative classique mais la
**fiabilité informationnelle** : une réponse plausible mais non fondée
sur le corpus peut induire une décision de conformité erronée. Le
service RAG doit systématiquement citer ses sources et s\'abstenir en
cas de similarité insuffisante (cf. EF-RAG-03).

**12.3 Données personnelles et résidence**

Le traitement de documents de transport peut contenir des données
personnelles (noms de chauffeurs, immatriculations). Le cadre
camerounais (communications électroniques et cybersécurité, supervision
ANTIC) s\'applique ; un bureau public peut exiger une résidence
nationale des données du corpus et des journaux d\'audit.

**12.4 Sécurité applicative**

-   Chiffrement en transit et au repos ; authentification forte pour les
    rôles d\'administration du corpus.

-   Journal d\'audit append-only pour toute modification de corpus et
    toute décision sur anomalie.

-   Isolation stricte multi-tenant, vérifiée par tests automatisés à
    chaque déploiement.

-   Séparation des environnements ; secrets centralisés ; durcissement
    CI/CD.

**13. Plan de phasage et jalons Go / No-Go**

Principe : aucun développement de portée avant la Phase 0. Le MVP livre
d\'abord la valeur RAG sur un bureau et un client Web, avant d\'étendre
aux trois plateformes et au multi-bureau.

  -----------------------------------------------------------------------------
  **Phase**       **Contenu**                   **Jalon Go /        **Durée**
                                                No-Go**             
  --------------- ----------------------------- ------------------- -----------
  0 ---           Disponibilité effective d\'un Go si : corpus      4--6 sem.
  Validation      corpus réglementaire          disponible ET       
                  exploitable ; accord d\'au    accord de principe  
                  moins un bureau (BGFT) pour   d\'un bureau ET     
                  le fournir ; confirmation du  budget LLM validé   
                  budget d\'appel LLM ;                             
                  entretiens grands comptes                         

  1 --- MVP RAG + Ingestion du corpus initial,  Pilote sur 1 bureau 3--4 mois
  Web             moteur RAG, client Web        ; taux de réponses  
                  (questions, back-office       sourcées et fiables 
                  conformité), canal WhatsApp   mesuré ; premiers   
                                                retours             
                                                utilisateurs        

  2 --- Mobile +  Client mobile (Flutter,       Adoption terrain    2--3 mois
  Anomalies       offline-first), détection     mesurée ; taux de   
                  d\'anomalies documentaires,   détection           
                  notifications push            d\'anomalies validé 
                                                par le responsable  
                                                conformité          

  3 --- Desktop + Client desktop                2ᵉ bureau actif ;   2--3 mois
  Multi-bureau    (administration du corpus),   isolation           
                  réplication à un 2ᵉ bureau    multi-tenant        
                  (BNFT), gouvernance           vérifiée ; SLO      
                  multi-tenant                  tenus               

  4 ---           Portail partenaire commun,    Décision conjointe  À planifier
  Intégration     identité tenant partagée,     des deux directions 
  FretCorridor    rapprochement mission ↔ pièce produit ; valeur    
  (optionnelle)   réglementaire                 autonome toujours   
                                                garantie            
  -----------------------------------------------------------------------------

**14. Charge et budget indicatifs**

*Avertissement : ordres de grandeur d\'effort (hommes-mois), non un
devis. La conversion en FCFA exige la grille de coûts chargés par
profil.*

  ------------------------------------------------------------------------
  **Lot**                         **Charge         **Commentaire**
                                  indicative       
                                  (h-m)**          
  ------------------------------- ---------------- -----------------------
  Phase 0 (corpus, accords,       1 -- 1,5         Négociation bureau,
  budget LLM)                                      cartographie du corpus
                                                   disponible

  Socle backend Go (API, RBAC,    3 -- 4           Réutilisable pour
  multi-tenant, observabilité,                     l\'intégration future à
  CI/CD)                                           FretCorridor

  Service RAG (ingestion,         3 -- 4           Cœur de la valeur
  embeddings, recherche, appel                     produit
  LLM)                                             

  Client Web (Angular PWA)        2 -- 3           Questions, import
                                                   documentaire,
                                                   back-office

  Client Mobile (Flutter,         2,5 -- 3,5       Capture photo, file
  offline-first)                                   offline, notifications

  Client Desktop (packaging natif 1 -- 1,5         Administration corpus,
  du client Web)                                   supervision

  Module Anomalies (ANO)          1,5 -- 2         Scoring de risque, file
                                                   de contrôle

  Sécurité, audit, multi-tenant   1 -- 2           Isolation, journal
  durci                                            append-only
  ------------------------------------------------------------------------

**15. Hypothèses et dépendances**

-   Un bureau de fret (BGFT en priorité) accepte de fournir un corpus
    réglementaire exploitable et à jour --- hypothèse centrale, non
    vérifiée.

-   Le budget d\'appel à une API LLM externe est validé et soutenable à
    l\'échelle du volume de questions attendu.

-   Les grands comptes (cimentiers, brasseries) sont disposés à payer
    pour un assistant de conformité et de détection d\'anomalies.

-   Le canal WhatsApp reste économiquement viable dans la stratégie de
    coût par message définie par FretCorridor.

-   Une intégration éventuelle avec FretCorridor reste optionnelle et
    n\'est jamais un prérequis bloquant.

**16. Critères d\'acceptation et indicateurs**

**16.1 Critères d\'acceptation du MVP (extraits)**

-   Une question réglementaire posée sur l\'un des trois canaux (Web,
    Mobile, WhatsApp) obtient une réponse sourcée en moins de 5 s en
    P95, ou une abstention explicite si le corpus ne couvre pas la
    question.

-   Le client desktop permet l\'ajout d\'un nouveau texte réglementaire
    au corpus, visible en recherche par similarité en moins de X minutes
    après ré-indexation.

-   Un lot de documents importés signale les documents atypiques avec un
    niveau de risque exploitable par le responsable conformité.

-   L\'isolation multi-tenant entre bureaux est vérifiée par tests
    automatisés (aucune fuite de corpus).

**16.2 Indicateurs de pilotage**

  -----------------------------------------------------------------------
  **Indicateur**                  **Cible                 **Horizon**
                                  (illustrative)**        
  ------------------------------- ----------------------- ---------------
  Bureaux sous abonnement         ≥ 1 (BGFT), puis 2ᵉ     Ph.1 → Ph.3

  Taux de réponses sourcées et    ≥ 90 % des questions    Fin Ph.1
  fiables                         traitées                

  Taux d\'abstention justifiée    0 hallucination non     Continu
  (vs hallucination détectée)     signalée                

  Grands comptes payants          1--3 pilotes            Fin Ph.2

  Documents analysés en détection Volume mensuel          Ph.2 → Ph.3
  d\'anomalies                    croissant               

  Coût moyen d\'appel LLM par     Sous plafond défini     Continu
  question                                                
  -----------------------------------------------------------------------

**17. Registre des risques**

*P/I sur échelle Faible/Moyen/Élevé.*

  ------------------------------------------------------------------------------
  **\#**   **Risque**                **P**    **I**    **Mitigation**
  -------- ------------------------- -------- -------- -------------------------
  R1       Hallucination ou réponse  Moyen    Élevé    Abstention explicite
           plausible mais non fondée                   obligatoire (EF-RAG-03) ;
           sur le corpus                               citation systématique des
                                                       sources ; revue humaine
                                                       des cas signalés

  R2       Corpus réglementaire      Élevé    Élevé    Phase 0 conditionnée à la
           incomplet, obsolète ou                      disponibilité effective
           non fourni par le bureau                    du corpus ; versionning
                                                       et date d\'effet
                                                       obligatoires

  R3       Dépendance à une API LLM  Moyen    Moyen    Passerelle Go dédiée,
           externe (coût,                              budget plafonné, option
           disponibilité,                              de repli sur un modèle
           souveraineté des données)                   auto-hébergé si
                                                       nécessaire

  R4       Confusion de              Faible   Moyen    Communication claire du
           positionnement avec                         garde-fou « jamais de
           FretCorridor auprès des                     matching, jamais de
           clients                                     crédit » ; message aligné
                                                       avec §3

  R5       Adoption faible si l\'UX  Moyen    Moyen    API et moteur RAG uniques
           diffère entre canaux                        (ENF-PLT-01/02) ; tests
           (Web, Mobile, WhatsApp)                     d\'expérience croisés
                                                       entre plateformes

  R6       Fuite de données entre    Faible   Élevé    Isolation multi-tenant
           tenants (corpus,                            vérifiée par tests
           documents importés)                         automatisés à chaque
                                                       déploiement (ENF-MUL-01)

  R7       Duplication de logique    Moyen    Moyen    Toute règle de pertinence
           métier entre les trois                      ou de seuil reste côté
           clients, dérive de                          backend Go (ENF-PLT-01)
           comportement                                

  R8       Coût WhatsApp incontrôlé  Moyen    Faible   Stratégie « pull »,
           si le canal est                             fenêtre 24 h, repli
           sur-sollicité                               automatique vers
                                                       Web/Mobile (EF-CNL-03)
  ------------------------------------------------------------------------------

**18. Sources et références**

-   Note de synthèse BoussoleFret IA, Direction Technique Flysoft
    Engineering, 22 juillet 2026 --- principe, positionnement, cas
    d\'usage.

-   CDC FretCorridor v3.0 (FSE-CDC-FRETCORRIDOR-2026-003), 29 juin 2026
    --- méthodologie, stack technique de référence, exigences EF-CMP-03
    et EF-INT-05 cadrant la conformité.

-   Meta --- tarification WhatsApp Business par message depuis le
    01/07/2025 ; templates utilitaires gratuits dans la fenêtre de 24 h.

**19. Glossaire**

  --------------------------------------------------------------------------
  **Terme**              **Définition**
  ---------------------- ---------------------------------------------------
  RAG                    Technique consistant à fournir à un LLM le contexte
  (Retrieval-Augmented   pertinent, retrouvé par similarité dans un corpus
  Generation)            indexé, avant génération de la réponse.

  Embedding              Représentation vectorielle d\'un texte, permettant
                         de mesurer une similarité sémantique.

  pgvector               Extension PostgreSQL pour le stockage et la
                         recherche de vecteurs (embeddings).

  LLM                    Modèle de langage large, utilisé ici uniquement
                         pour générer la formulation d\'une réponse à partir
                         d\'un contexte fourni.

  Corpus                 Ensemble de textes réglementaires vectorisés et
                         indexés, propre à un bureau ou tenant.

  LVI / LVO              Lettre de voiture internationale / intérieure
                         (document obligatoire de transport, CEMAC).

  Multi-tenant           Architecture servant plusieurs clients isolés
                         (bureaux, grands comptes) sur une même instance.

  Offline-first          Conception d\'application mobile capturant les
                         actions localement et les synchronisant au retour
                         réseau.

  Abstention (produit)   Réponse explicite indiquant l\'absence de source
                         fiable, plutôt qu\'une réponse générée sans
                         fondement dans le corpus.
  --------------------------------------------------------------------------
