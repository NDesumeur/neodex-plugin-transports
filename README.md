# Transports

Les prochains passages de **tous les réseaux de France** à l'arrêt de ton choix : bus, tram, métro, car et train (TER, Intercités, TGV). Tu choisis tes réseaux dans le catalogue national, par exemple Tadao, Ilévia (métro et bus de Lille) et les TER Hauts-de-France, et tu les gardes tous ensemble. Horaires officiels, temps réel quand le réseau le donne, perturbations, itinéraires.

*English version: [README.en.md](README.en.md)*

## Il faut partir (nouveau en 2.1.0)

Le bouton ⏰ sur un passage : une notification quand il est temps de partir, d’après l’heure réelle (retards compris) et ta marche jusqu’à l’arrêt, une fois ou chaque jour. Si le passage est supprimé, la notification donne le suivant.

## Choisir ses réseaux

- **+ Choisir mon réseau** (ou **+ Réseau**) ouvre le catalogue de transport.data.gouv.fr : plus de 450 réseaux. Cherche une ville, une région, un réseau ou un exploitant (« Lille », « Hauts-de-France », « TER », « Tadao »…).
- Le badge **Temps réel** signale les réseaux qui donnent les retards en direct ; les autres n'ont que les horaires.
- Tu peux garder plusieurs réseaux : la recherche d'arrêt cherche dans tous. La croix ✕ retire un réseau (et ses arrêts favoris).
- Les très grands réseaux (l'Île-de-France entière, près de 400 000 trajets) sont marqués **Trop grand** : ils demanderaient plusieurs Go de mémoire.
- Les horaires d'un réseau sont téléchargés à la première recherche, gardés sur ton appareil et remis à jour chaque semaine.

## Trouver un arrêt

- Tape le nom d'un arrêt, d'une gare ou d'un lieu. La recherche tolère les fautes de frappe et les lettres inversées, et cherche aussi dans le nom de la ville.
- Les quais d'un même pôle et les voies d'une même gare sont regroupés en un seul arrêt.

## Les prochains passages

- Les départs des **3 prochaines heures**, du plus proche au plus lointain : la ligne avec sa couleur, la destination et le temps d'attente.
- Avec le temps réel : **retard exact** annoncé par le réseau, trajet **supprimé** (barré), arrêt **non desservi**, véhicule **● en circulation** avec le nombre d'arrêts qui le séparent de toi. Sans retard annoncé, le retard est estimé d'après la position du véhicule.
- Les **alertes du réseau** (travaux, déviation, grève…) qui touchent les lignes de l'arrêt s'affichent en haut.
- La liste se remet à jour toute seule toutes les 30 secondes. **Clique un départ** pour voir le plan de la ligne avec ses heures et le véhicule qui avance.

## Être prévenu des perturbations

Garde un arrêt avec ☆, puis active **Perturbations : oui**. Toutes les 5 minutes, même onglet fermé, NeoDex regarde la prochaine heure à cet arrêt : un passage supprimé, 10 minutes de retard ou plus, ou une nouvelle alerte du réseau, et tu reçois une notification (une seule par passage ou par alerte). Les arrêts surveillés ont une 🔔 dans **Mes arrêts**.

## Itinéraire

Choisis un arrêt de départ (ou garde celui affiché) et un arrêt d'arrivée **du même réseau**, puis **Quel trajet ?** : les trajets directs et ceux avec une correspondance (2 minutes au moins pour changer), d'après les horaires.

## Sources

Catalogue, horaires (GTFS) et temps réel (GTFS-RT : retards, suppressions, positions, alertes) publiés par chaque réseau sur transport.data.gouv.fr, téléchargés directement par NeoDex.

## Données et synchronisation

Tes réseaux et tes arrêts favoris sont enregistrés par NeoDex, sauvegardés et synchronisés entre tes appareils si la synchro est activée. Les horaires téléchargés restent sur chaque appareil.

## Installer

Dans NeoDex : **NeoStore → À découvrir → Transports → Installer**.

Développer un plugin : voir le [SDK NeoDex](https://github.com/NDesumeur/neodex-sdk).

## Il faut partir (2.1.0)

Le bouton **⏰** sur un passage pose une alerte : tu dis combien de minutes il te faut pour marcher jusqu’à l’arrêt et si c’est **une fois**, **du lundi au vendredi** ou **tous les jours**.

- Transports regarde l’heure réelle du passage (retards compris), même onglet fermé, et envoie « Il faut partir : B1 → Liévin · Passage à Médiathèque à 08:22 (dans 6 min, 2 min de retard) · 5 min à pied » au bon moment, une seule fois par jour.
- Si le passage est supprimé, la notification le dit et donne le suivant.
- Les alertes sont listées en haut de l’onglet, chacune avec sa croix pour la supprimer. Elles restent sur cet appareil.
