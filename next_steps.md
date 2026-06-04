migrer les infos sur une db (donc tout ce qui est info user, contexte de discussion, etc) (sqlite assez rapide pour le mvp, sinon pour de la prod postgreSQL)

avoir un minimum de sécurité sur l' auth (XSS attaques et SQL injection si db)

secure nginx avec https sur la partie externe, avoir du rate limiting et load balancing

avoir une base de monitoring avec prometheus (avec de l' alerting system, des healthchecks, et des requetes sur quelques métriques métiers) et grafana pour des dashboard de ces métrique et un monitoring plus simple dans l' ensemble 




Pour contrer une limite de tokens, il faut surtout réduire ce que tu envoies au modèle.
Le plus utile pour ton projet :
1. résumer l’historique
- ne pas renvoyer toute la conversation brute
- garder :
- les 4 à 8 derniers messages
- un summary de la demande
- quelques faits clés mémorisés
2. stocker des faits structurés
- au lieu de repasser tout l’historique
- garder seulement :
- besoin client
- appareil
- budget
- problème
- statut de la demande
- puis injecter ça dans le prompt
3. tronquer intelligemment
- ne jamais couper au hasard
- supprimer d’abord :
- répétitions
- formules de politesse
- réponses longues déjà résolues
- garder ce qui influence la prochaine réponse
4. séparer contexte système et contexte conversation
- prompt système court et stable
- contexte métier compact
- conversation récente courte
5. faire du “rolling summary”
- après quelques messages :
- générer un résumé court de la discussion
- puis remplacer les anciens messages par ce résumé
6. limiter la sortie
- réduire max_tokens côté réponse quand possible
- surtout si la réponse attendue doit être courte
7. détecter les demandes de rappel
- si le client demande “combien j’ai dit ?”
- mieux vaut lire la mémoire/facts stockés
- pas besoin de réinjecter toute la conversation
Pour ton cas concret, la meilleure approche serait :
- ticket_messages pour l’historique brut
- ticket_summary pour un résumé vivant
- ticket_memory pour les faits clés
- et au moment du call OpenAI :
- prompt système
- mémoire/facts
- résumé
- 4 derniers messages max
Si tu veux, je peux te l’implémenter proprement dans le backend actuel.


exemple: 

Je cherche une offre pour un smartphone et je veux rester sous 500 euros.
Tu peux me rappeller ma contrainte ?


Mon appareil est un iphone 13 et la batterie tient 2 heures max

Tu peux reprendre ce que je t' ai di


TODO:

syteme de context (a finir)
modif un peu l' UI
    - enlever le bouton profil dans le menu Mes demandes)
    - ptit logo au debut machin homepage, ui global (couleurs, polices etc)
register en admin
en admin pouvoir filtrer les différents types de tickets
voir si le user peut changer de demandes facilement 
verif que l' on repond bien a la solution metier en terme de classification et autre


Faire en sorte que si le llm il est inaccessible on puisse avoir un message comme quoi il est down et avoir un lien vers une faq ou contacter par mail, en chose a faire sur les 3j, si le llm est down en prendre un autre si il y a des clés api différentes, et regarder comment déployé sur railway