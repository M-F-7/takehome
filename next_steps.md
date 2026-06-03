migrer les infos sur une db (donc tout ce qui est info user, contexte de discussion, etc) (sqlite assez rapide pour le mvp, sinon pour de la prod postgreSQL)

avoir un minimum de sécurité sur l' auth (XSS attaques et SQL injection si db)

secure nginx avec https sur la partie externe, avoir du rate limiting et load balancing

avoir une base de monitoring avec prometheus (avec de l' alerting system, des healthchecks, et des requetes sur quelques métriques métiers) et grafana pour des dashboard de ces métrique et un monitoring plus simple dans l' ensemble 


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