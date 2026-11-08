# Transports (Public transport)

The next Tadao buses (the network of Lens, Liévin, Hénin-Beaumont and Carvin, in northern France) at the stop of your choice: official timetables, buses tracked live, estimated delay or earliness, and the stops of each trip. Keep your usual stops as favourites to find them in one click.

*Version française : [README.md](README.md)*

## Find a stop

- Type the name of a stop or place ("Gare de Lens", "Bollaert"…). The search tolerates typos and swapped letters, and also searches town names; the 20 best results are shown.
- The platforms of a hub ("Quai 1", "Quai 4"…) are grouped into a single stop.
- The first search downloads the Tadao timetables (about 20 MB); they are then kept on your PC and refreshed every week.

## Next departures

- For the chosen stop, departures in the **next 3 hours**, soonest first: the line with its colour, the destination and the waiting time ("4 min", "at the stop", or the time beyond an hour).
- A bus **● running** is tracked live: the plugin shows how many stops away it is and estimates its delay or earliness from its position. Otherwise, it is the scheduled time.
- The list refreshes itself every 30 seconds.
- **Click a departure** to see every stop on that trip with its time; those already served are greyed out.

## My stops

The ☆ button keeps the stop shown in **My stops**, at the top of the plugin; ★ removes it.

## Sources

Timetables (GTFS) and live bus positions (GTFS-RT) published by Tadao on transport.data.gouv.fr, downloaded directly by NeoDex.

## Data and sync

Your favourite stops are stored by NeoDex, backed up and synced between your PCs when sync is on. Downloaded timetables stay on each PC.

## Install

In NeoDex: **NeoStore → Discover → Transports → Install**.

Building a plugin: see the [NeoDex SDK](https://github.com/NDesumeur/neodex-sdk).
