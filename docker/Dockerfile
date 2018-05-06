FROM node:4.8.4-stretch

RUN echo 'debconf debconf/frontend select Noninteractive' | debconf-set-selections

RUN set -ex \
  && echo "deb http://repo.mysql.com/apt/debian/ stretch mysql-5.6\ndeb-src http://repo.mysql.com/apt/debian/ stretch mysql-5.6" > /etc/apt/sources.list.d/mysql.list \
  && wget -O /tmp/RPM-GPG-KEY-mysql https://repo.mysql.com/RPM-GPG-KEY-mysql \
  && apt-key add /tmp/RPM-GPG-KEY-mysql \
  && apt-get update && apt-get install -y --no-install-recommends \
		git libicu-dev mysql-server \
	&& rm -rf /var/lib/apt/lists/*

RUN update-rc.d mysql defaults

RUN npm install -g grunt-cli
RUN npm install -g bower

EXPOSE 5858 9000 3306

ADD init.sh /bin/init.sh

ENTRYPOINT /bin/init.sh