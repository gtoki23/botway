FROM botwayorg/botway-cli:latest AS bw

ARG {{.BotSecrets}}

COPY . .

RUN botway docker-init

FROM python:alpine

ENV PACKAGES "build-dependencies build-base gcc abuild binutils binutils-doc gcc-doc py-pip jpeg-dev zlib-dev python3 python3-dev libffi-dev git boost boost-dev"

COPY --from=bw /root/.botway /root/.botway

COPY . .

RUN apk update && \
	apk add --no-cache --virtual ${PACKAGES}

# To add more packages
# RUN apk add PACKAGE_NAME

# Install pyenv
RUN pip install tld --ignore-installed six distlib --user

RUN curl https://raw.githubusercontent.com/pyenv/pyenv-installer/master/bin/pyenv-installer | bash

ENV PATH="/root/.pyenv/bin:$PATH"
RUN echo 'eval "$(pyenv init -)"' >> ~/.bashrc
RUN echo 'eval "$(pyenv virtualenv-init -)"' >> ~/.bashrc
RUN /bin/bash -c "bash"

# Install pipenv and deps
RUN curl https://raw.githubusercontent.com/pypa/pipenv/master/get-pipenv.py | python3
RUN pipenv lock
RUN pipenv sync --system
RUN pipenv install

ENTRYPOINT ["pipenv", "run", "python3", "./src/main.py"]
