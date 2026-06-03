migrer les infos sur une db (donc tout ce qui est info user, contexte de discussion, etc) (sqlite assez rapide pour le mvp, sinon pour de la prod postgreSQL)

avoir un minimum de sécurité sur l' auth (XSS attaques et SQL injection si db)

secure nginx avec https sur la partie externe, avoir du rate limiting et load balancing

avoir une base de monitoring avec prometheus (avec de l' alerting system, des healthchecks, et des requetes sur quelques métriques métiers) et grafana pour des dashboard de ces métrique et un monitoring plus simple dans l' ensemble 


TODO:

syteme de context
register en admin
