# Transports

Les prochains passages des bus Tadao (réseau de Lens, Liévin, Hénin-Beaumont et Carvin) à l'arrêt de ton choix : horaires officiels, bus suivis en direct, retard ou avance estimés, et le détail des arrêts de chaque trajet. Garde tes arrêts habituels en favoris pour les retrouver d'un clic.

*English version: [README.en.md](README.en.md)*

## Trouver un arrêt

- Tape le nom d'un arrêt ou d'un lieu (« Gare de Lens », « Bollaert »…). La recherche tolère les fautes de frappe et les lettres inversées, et cherche aussi dans le nom de la ville ; les 20 meilleurs résultats s'affichent.
- Les quais d'un même pôle (« Quai 1 », « Quai 4 »…) sont regroupés en un seul arrêt.
- La première recherche télécharge les horaires Tadao (environ 20 Mo) ; ils sont ensuite gardés sur ton PC et remis à jour chaque semaine.

## Les prochains passages

- Pour l'arrêt choisi, les départs des **3 prochaines heures**, du plus proche au plus lointain : la ligne avec sa couleur, la destination et le temps d'attente (« 4 min », « à quai », ou l'heure au-delà d'une heure).
- Un bus **● en circulation** est suivi en direct : le plugin indique à combien d'arrêts il se trouve et estime son retard ou son avance d'après sa position. Sinon, c'est l'horaire prévu.
- La liste se remet à jour toute seule toutes les 30 secondes.
- **Clique un départ** pour voir tous les arrêts de ce trajet avec leurs heures de passage ; ceux déjà desservis sont grisés.

## Mes arrêts

Le bouton ☆ garde l'arrêt affiché dans **Mes arrêts**, en haut du plugin ; ★ le retire.

## Sources

Horaires (GTFS) et positions des bus en direct (GTFS-RT) publiés par Tadao sur transport.data.gouv.fr, téléchargés directement par NeoDex.

## Données et synchronisation

Tes arrêts favoris sont enregistrés par NeoDex, sauvegardés et synchronisés entre tes PC si la synchro est activée. Les horaires téléchargés restent sur chaque PC.

## Installer

Dans NeoDex : **NeoStore → À découvrir → Transports → Installer**.

Développer un plugin : voir le [SDK NeoDex](https://github.com/NDesumeur/neodex-sdk).
