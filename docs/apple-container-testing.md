# Integrationstests auf Apple's Container-Runtime (ohne Docker Desktop)

Die Go-Integrationstests starten MySQL über `testcontainers-go`. Das braucht eine
Docker-Engine-API — Apple's `container` bringt keine mit. Die Lücke schließt
[socktainer](https://github.com/socktainer/socktainer), ein Docker-kompatibler
REST-API-Server auf Apple's Container-Framework.

Voraussetzung: macOS 26 (Tahoe) oder neuer, Apple Silicon.

## Einmaliges Setup

```sh
brew install socktainer          # Version muss zu `container --version` passen
```

`socktainer` prüft beim Start, ob Client- und Server-Version von Apple's
`container` übereinstimmen, und verweigert sonst den Dienst.

## Vor dem Testlauf

```sh
container system start                                   # startet container-apiserver
socktainer &                                             # Docker-API auf ~/.socktainer/container.sock
export DOCKER_HOST="unix://$HOME/.socktainer/container.sock"
export TESTCONTAINERS_RYUK_DISABLED=true
```

`TESTCONTAINERS_RYUK_DISABLED` ist **nicht optional**: Ryuk, der Aufräum-Container
von Testcontainers, mountet den Docker-Socket in einen Container hinein — das
kann socktainer nicht. Ohne die Variable bricht jeder Lauf beim Start von Ryuk ab.
Aufräumen übernimmt stattdessen `TestMain` in `api_go/tests/setup_utils.go`
(`mysqlInstance.Terminate`).

Danach wie gewohnt:

```sh
cd api_go && go test ./...
```

## Homebrew-Service: nicht benutzen

`brew services start socktainer` läuft mit einem eigenen `HOME`
(`/opt/homebrew/var/run/socktainer`) und findet den `container-apiserver` der
Benutzersitzung nicht — der Dienst stirbt mit
`XPC connection error: Connection invalid`. Schlimmer noch: er deregistriert den
`container-apiserver` beim Stoppen, danach schlägt auch `container ls` fehl, bis
`container system start` erneut läuft. `socktainer` daher direkt als eigener
Benutzer starten.

## Warum der Test-Harness die Container-IP kennt

Apple's `container` 1.1.0 forwardet publizierte Ports unzuverlässig: die
TCP-Verbindung auf `localhost:<mapped>` wird angenommen, aber es fließen keine
Bytes. Beobachtet beim ersten Testlauf über socktainer und reproduzierbar direkt
mit `container run -p 13306:3306` sowie mit `-p 127.0.0.1:13307:3306` — dort auch
25 Sekunden nach Containerstart, es ist also keine reine Anlaufverzögerung.

Über socktainer trägt der gemappte Port inzwischen zuverlässig, sofern vor dem
ersten echten Verbindungsaufbau einmal geprüft wurde. `resolveMySQLEndpoint` in
`api_go/tests/setup_utils.go` tut genau das: es prüft, ob der gemappte Port den
MySQL-Handshake liefert (MySQL spricht zuerst), und fällt andernfalls auf die
Container-IP mit Port 3306 zurück, die vom Host aus immer erreichbar ist. Im
Normalfall gewinnt der gemappte Port; der Fallback ist das Sicherheitsnetz für
den beobachteten Ausfall. Auf echtem Docker und in der CI bleibt alles wie
vorher, ohne Umgebungsschalter.

## `docker`-Kommando

`~/.local/bin/docker` ist ein Shim auf Apple's `container` mit Übersetzung der
abweichenden Verben (`ps` → `list`, `images` → `image list`, `rmi` →
`image delete`, …). Er ist für die Kommandozeile gedacht und ersetzt keine
Docker-API.

Wer den echten Docker-Client bevorzugt: `brew install docker` (nur das CLI)
installieren, den Shim löschen und socktainers Kontext nutzen — socktainer
registriert ihn beim Start selbst:

```sh
docker context use socktainer
```
