# Transports

The next departures of **every transit network in France** at the stop of your choice: bus, tram, metro, coach and train (TER, Intercités, TGV). You pick your networks from the national catalogue, for example Tadao, Ilévia (Lille metro and buses) and the Hauts-de-France TER, and keep them all together. Official timetables, real time when the network provides it, disruptions, journeys.

*Version française : [README.md](README.md)*

## Pick your networks

- **+ Choose my network** (or **+ Network**) opens the transport.data.gouv.fr catalogue: more than 450 networks. Search a town, a region, a network or an operator ("Lille", "Hauts-de-France", "TER", "Tadao"…).
- The **Real time** badge marks networks that give live delays; the others only have timetables.
- You can keep several networks: stop search looks in all of them. The ✕ removes a network (and its favourite stops).
- Very large networks (the whole Île-de-France, nearly 400,000 trips) are marked **Too big**: they would need several GB of memory.
- A network's timetables are downloaded at the first search, kept on your device and refreshed every week.

## Find a stop

- Type the name of a stop, a station or a place. Search tolerates typos and swapped letters, and also looks in the town name.
- The platforms of a hub and the tracks of a station are grouped into a single stop.

## Next departures

- Departures for the **next 3 hours**, nearest first: the line with its colour, the destination and the waiting time.
- With real time: **exact delay** given by the network, **cancelled** trip (struck through), **stop not served**, vehicle **● on the way** with the number of stops between it and you. Without an announced delay, the delay is estimated from the vehicle's position.
- **Network alerts** (works, diversion, strike…) affecting the stop's lines show at the top.
- The list refreshes by itself every 30 seconds. **Click a departure** to see the line map with its times and the vehicle moving.

## Disruption alerts

Keep a stop with ☆, then turn on **Disruptions: yes**. Every 5 minutes, even with the tab closed, NeoDex checks the next hour at that stop: a cancelled departure, a delay of 10 minutes or more, or a new network alert, and you get a notification (only one per departure or alert). Watched stops have a 🔔 in **My stops**.

## Journey

Pick a departure stop (or keep the one shown) and an arrival stop **on the same network**, then **Which trip?**: direct trips and trips with one change (at least 2 minutes to change), from the timetables.

## Sources

Catalogue, timetables (GTFS) and real time (GTFS-RT: delays, cancellations, positions, alerts) published by each network on transport.data.gouv.fr, downloaded directly by NeoDex.

## Data and sync

Your networks and favourite stops are saved by NeoDex, backed up and synced between your devices if sync is on. Downloaded timetables stay on each device.

## Install

In NeoDex: **NeoStore → Discover → Transports → Install**.

Building a plugin: see the [NeoDex SDK](https://github.com/NDesumeur/neodex-sdk).
