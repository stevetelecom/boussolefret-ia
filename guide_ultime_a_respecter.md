# Guide ultime à respecter — Consignes pour agent IA qui code avec moi

## Sécurité

- Le code généré doit être **sécurisé contre tout type d'attaque**.
- Tous les inputs doivent être **filtrés/validés**, pour éviter les injections SQL et les attaques de type XSS.
- Les champs de type **password** doivent avoir une icône "œil" pour afficher/masquer la saisie.

## Frontend

- Les interfaces doivent être **modernes** et **bien stylées**.
- Pas d'utilisation d'**emojis** : utiliser des **icônes Material** (icon themes) et les polices **Google Fonts**.
- Les tableaux doivent être **dynamiques** (jQWidgets), **animés**, avec de **belles couleurs**.
- Toutes les actions **CRUD** doivent être des **modals** si possible.
- Chercher un **logo adapté** en ligne pour l'application.
- Utiliser des **vidéos en arrière-plan** et de jolis visuels animés (ex. courbes de gravitation) adaptés au contexte de l'application.
- Le design doit toujours être **responsive**.
- Faire des **recherches en ligne** sur les sites de grandes entreprises (Google, Amazon, Microsoft, etc.) pour s'inspirer de leur frontend et rester moderne et professionnel.

## Notifications CRUD

- Pour chaque action CRUD, il faut une confirmation via **toast** dès que le modal est validé (POST ou GET).
- Implémenter des notifications **toast** pour chaque action CRUD.

## Qualité du code

- Bien comprendre le projet avant de coder.
- Éviter le code "touffu" (mal structuré).
- Le code doit être **transparent, robuste, fiable**, conforme à la documentation officielle de chaque langage.
- Toujours **commenter le code** pour faciliter la maintenance.
- Pour toute notion non précisée, faire des recherches sur les **sites officiels** et l'implémenter.

## Workflow Git

- L'utilisateur travaille avec **git** : donner les commandes de commit après chaque fonctionnalité codée.
- Cloner le repo, tester que ça fonctionne, avant d'envoyer le code.

## Agents de code (Claude Code, Kiro, Cursor, etc.)

- Si l'agent IA est un agent de type **Claude Code, Kiro, Cursor** (ou similaire) capable de coder et tester directement dans l'environnement, il doit **coder et tester directement**.
- Une fois codé et testé, laisser l'utilisateur **voir le résultat** pour qu'il puisse **accepter ou refuser**.
- Toujours **suivre le plan d'action** établi.
- Avancer **module par module** (ne pas tout coder en une seule fois).

## Environnement terminal

- **Ubuntu** : utiliser `cat`, `grep`, `python`.
- **Windows (git bash)** : utiliser `git apply` ; **ne pas utiliser `python3`**, préférer `python` ou `sed` suivi de `grep` pour insérer du code dans de gros fichiers.
- L'utilisateur préfère coder au terminal pour éviter les erreurs de copier-coller (copie en local, puis push dès qu'une fonctionnalité est terminée).
