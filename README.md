# Food Waste – The Whole Story

## Il progetto

Ogni giorno nel mondo si perdono tonnellate di cibo prima ancora di arrivare ai consumatori.  
Ma ciò che spesso manca non è solo il cibo: **mancano le informazioni**. Mancano dati. Mancano interi pezzi della storia.

Questo progetto nasce da una domanda semplice ma potente:

> **Cosa ci raccontano i dati? E cosa ci raccontano quelli che non ci sono?**

Il dataset FAO sul food loss è ricco di numeri, ma anche di vuoti. Analizzandolo, ci siamo accorti che per molti **Paesi, anni o commodity** esistono interi blocchi di informazioni mancanti.  
Queste assenze non sono solo un limite tecnico: **sono un messaggio**.

Lo spreco non si misura solo nei prodotti agricoli che non arrivano nei piatti, ma anche nelle **informazioni perse lungo la filiera**.  
Da questa intuizione nasce il concept del progetto: *dare voce a ciò che solitamente rimane invisibile*.

**Food Waste** non racconta solo *quanto* sprechiamo, ma anche **il rumore del vuoto** che rende questo fenomeno ancora più complesso da affrontare e da comprendere.  
Dove il dato è presente, **la forma è piena**. Dove è assente o parziale, *resta solo una sagoma*.

---

## Obiettivi di conoscenza

Il progetto guida l’utente a scoprire:

- **quanta perdita alimentare esiste nel mondo**;
- **come varia tra Paesi e categorie alimentari**;
- **in quale fase della filiera si spreca di più**;
- quanto il fenomeno sia *frammentato e parzialmente invisibile*;
- che **la mancanza di dati è parte del problema**: senza misurazioni, non possono esistere politiche efficaci.

L’utente è invitato a mettere in relazione **quantità di spreco** e **quantità di informazione disponibile**, sviluppando una consapevolezza critica.

---

## Struttura e navigazione del sito

Dopo una breve introduzione, il sito si apre con una **matrice dinamica** che cambia in base all’anno selezionato e ai Paesi che contribuiscono maggiormente al dataset.

- Ogni cella rappresenta l’incontro tra **Paese**, **commodity** e **anno**.
- Le **forme piene** indicano dati presenti.
- La **dimensione** è proporzionale alla percentuale di spreco per quella commodity.
- Le **sagome** o gli **spazi vuoti** segnalano l’assenza di informazioni.

Ogni vuoto diventa **un invito a cliccare** e a chiedersi *perché* quel dato non esiste.

Dalla visione generale è possibile accedere alla **pagina di dettaglio del singolo Paese**, organizzata per anno e commodity.  
Qui il racconto diventa più concreto:

- i **cestini** visualizzano la perdita alimentare;
- mostrano anche quando questa **non può essere misurata**;
- è possibile osservare la **fase di spreco principale nella filiera** e, quando disponibile, anche la **causa principale dello spreco**.

Ogni interazione permette di scoprire non solo quanto cibo viene perso, ma anche **quanto ne resta invisibile**.

---

## Il messaggio

> **Non possiamo risolvere ciò che non conosciamo.**  
> **E ciò che manca nei dati è già parte del problema.**

Questo sito non vuole solo informare, ma **interrogare, provocare e rendere visibile la complessità** di un tema globale.  
Le assenze **non ostacolano la comprensione**: *la rendono più profonda*.

---

## Dataset: informazioni e fonti

Il dataset utilizzato proviene dalla **FAO – Technical Platform on the Measurement and Reduction of Food Loss and Waste**, la principale piattaforma internazionale dedicata allo studio delle perdite e degli sprechi alimentari lungo la filiera.

La FAO aggrega informazioni provenienti da:

- oltre **700 pubblicazioni scientifiche**;
- **rapporti istituzionali**;
- **banche dati globali** (World Bank, IFPRI, FAOSTAT);
- **studi nazionali**.

La versione più recente include oltre **29.000 punti dati** ed è un sistema *“vivente”*, costantemente aggiornato.

### Metodi di raccolta FAO

- **raccolta manuale** dalla letteratura scientifica;
- **raccolta automatizzata** tramite FAO Data Lab (web scraping, NLP, estrazione di valori e metadati).

Ogni osservazione conserva informazioni sulla **metodologia utilizzata**.

### I campi del dataset

- m49 code  
- country  
- region  
- cpc code  
- commodity  
- year  
- loss percentage  
- loss quantity *(presente in 1/7 delle righe e spesso privo di unità di misura)*  
- activity  
- supply chain stage  
- treatment  
- cause of loss  
- sample size  
- method data collection  
- reference  
- url  
- notes  

La presenza di dati mancanti o ripetuti **non indica una mancanza di impegno**, ma riflette la **complessità del monitoraggio globale** dello spreco alimentare.

**Portale FAO:**  
https://www.fao.org/home/en/

---

## Metodologia progettuale

Per rendere il dataset esplorabile in modo chiaro e coerente, abbiamo:

- scelto di utilizzare i dati nelle colonne *country, commodity, year, loss percentage, food supply stage, cause of loss*;
- **standardizzato i nomi dei Paesi**;
- **raggruppato le commodity in 16 categorie** più ampie;
- **raggruppato le cause di perdita in 14 categorie**;
- calcolato la **percentuale media di spreco** per lo stesso prodotto nello stesso Paese e anno;
- identificato, per ogni prodotto, la **fase della catena di approvvigionamento con il maggiore spreco** e, ove possibile, la **causa principale**.

Il risultato è un dataset **più leggibile** e adatto a una **visualizzazione interattiva orientata alla comprensione**.

**Link al dataset:**  
https://docs.google.com/spreadsheets/d/1NZWyZyY00FchE5g2odcLVNRNYcSqfYXh57ye09JH8Pk/edit?gid=1460783596#gid=1460783596

---

## Strumenti utilizzati

### Per la prototipazione e il brainstorming

- **Excel e Google Fogli**, per sistemare in parte e rendere utilizzabile il dataset
- **Google Document**, per raccogliere idee di base del concept, opinioni, scambi, testi
- **Miro**, per organizzare visivamente il lavoro, definire una moodboard e uno stile
- **Figma**, per creare il mockup definitivo ed effettuare delle prove di visualizzazione 

### Per le illustrazioni

- **Illustrator**  
- **Procreate**

### Per lo sviluppo web

- **Visual Studio Code**, per la creazione del codice html, css, JavaScript e p5.js  
- **GitHub**, per la condivisione del progetto e il lavoro simultaneo

---

## Team

Questo progetto è stato realizzato dal **Gruppo 9 del Laboratorio di Information Design, C1, A.A. 2025–2026**.
I membri del team e i loro ruoli:

- **Caterina Gallo** — si è occupata di studio e ricerca, scelta di font e palette colori, definizione dello stile visivo, realizzazione delle illustrazioni, scrittura del copy dell’intro, codice html, css e JavaScript (parte introduttiva);
- **Giulia Furlani** — si è occupata di studio e ricerca, sviluppo del concept, prototipazione e mockup su Figma, scelta di font e palette colori, realizzazione delle illustrazioni;
- **Irene Massignani** — si è occupata di studio e ricerca, sintesi e semplificazione dataset, sviluppo del concept, definizione dello stile visivo, prototipazione e mockup su Figma, animazioni e codice html, css e JavaScript (pagine Data e About), verificazione della coerenza progettuale;
- **Rebecca Sole Bassani** — si è occupata di studio e ricerca, definizione degli obiettivi di conoscenza, sviluppo del concept, definizione dello stile visivo, sitemap e user flow, prototipazione e mockup su Figma, scrittura del copy e del README, codice html, css e JavaScript (parte introduttiva, header, footer, pagine Data e About), verificazione della coerenza progettuale;
- **Stefano Lorini** — si è occupato di studio e ricerca, realizzazione codice (html, css e JavaScript) di base del sito, codice pagina principale (p5.js), risoluzione dei problemi inerenti al codice, fix e debug, progettazione UX/UI;
- **Tommaso Barazzetta** — si è occupato di studio e ricerca, realizzazione codice di base del sito (html, css e JavaScript), codice pagina di dettaglio (p5.js), risoluzione dei problemi inerenti al codice, fix e debug, progettazione UX/UI.
