# Docker

Build the container:
```bash
docker build -t node4status_builder docker
```


Setup the mysql db (must be done only once):
```bash
# start the container and run bash
docker run -it --rm -v "$(pwd)":/root/status -v /tmp/status_mysql:/var/lib/mysql -p 5858:5858 -p 9000:9000 -p 3306:3306 node4status_builder /bin/bash

# create user, db and tables
echo "CREATE USER 'root'@'%' IDENTIFIED BY ''; GRANT ALL PRIVILEGES ON * . * TO 'root'@'%'; FLUSH PRIVILEGES;" | mysql -u root
echo "CREATE DATABASE spaceschalter" | mysql -u root
mysql -u root spaceschalter  < spaceschalter.sql
```


Use the container:
```bash
docker run -it --rm -v "$(pwd)":/root/status -v /tmp/status_mysql:/var/lib/mysql -p 5858:5858 -p 9000:9000 -p 3306:3306 node4status_builder /bin/bash
# inside

# start the db (runs in background)
service mysql start

# node tasks
grunt install
bower install
grunt serve
```

