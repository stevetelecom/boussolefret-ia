# Setup Docker sur Windows pour BoussoleFret IA

## 1. Prérequis

- Docker Desktop installé et démarré
- WSL 2 activé si demandé par Docker Desktop
- Git installé

## 2. Ouvrir PowerShell dans le dossier du projet

```powershell
cd C:\Users\leroi\Documents\projetboussolifretia\boussolefret-ia
```

## 3. Copier l’environnement

```powershell
Copy-Item .env.example .env
```

## 4. Ajuster le fichier .env si nécessaire

Modifie au minimum :

```text
POSTGRES_PASSWORD=change_me
MINIO_ROOT_PASSWORD=change_me_too
JWT_SECRET=change_me_with_a_long_random_string
```

## 5. Construire et lancer les conteneurs

```powershell
docker compose up --build -d
```

## 6. Vérifier l’état

```powershell
docker compose ps
```

## 7. Vérifier les services

```powershell
curl http://localhost:8080/health
curl http://localhost:8000/health
curl http://localhost:3000/
```

## 8. Voir les logs

```powershell
docker compose logs -f go-api
```

## 9. Arrêter les conteneurs

```powershell
docker compose down
```

## 10. Repartir de zéro (optionnel)

```powershell
docker compose down -v
```
