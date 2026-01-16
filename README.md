# Food Waste – The Whole Story

## Overview

Ogni giorno nel mondo si perdono tonnellate di cibo prima ancora di arrivare ai consumatori.  
Ma ciò che spesso manca non è solo il cibo: **mancano le informazioni**. Mancano dati. Mancano interi pezzi della storia.

Il dataset FAO sul *food loss and waste* è ricco di numeri, ma anche di **vuoti**: per molti Paesi, anni o commodity esistono interi blocchi di dati mancanti.    
Queste assenze non sono solo un limite tecnico: **sono un messaggio**.

Questo progetto nasce da una domanda semplice, ma potente:

> **Cosa ci raccontano i dati? E cosa ci raccontano invece quelli che non ci sono?**

**Food Waste - The Whole Story** è un progetto di *information design* che esplora lo spreco alimentare globale rendendo visibile non solo ciò che viene misurato, ma anche ciò che resta invisibile.  
Le mancanze del dataset non sono trattate come un errore, ma come **parte integrante del fenomeno**.

---

## Obiettivi di conoscenza

Il progetto guida l’utente a comprendere:

- **l’entità della perdita alimentare a livello globale**;
- **le differenze tra Paesi e categorie alimentari**;
- **le fasi della filiera in cui si concentra maggiormente lo spreco**;
- il carattere *frammentato e incompleto* delle informazioni disponibili;
- che **la mancanza di dati è parte del problema**: senza misurazioni, non possono esistere politiche efficaci.

---

## Concept e messaggio

> **Non possiamo risolvere ciò che non conosciamo.**  
> **E ciò che manca nei dati è già parte del problema.**

Il progetto si basa sull’idea che lo spreco non riguardi solo i prodotti agricoli lungo la filiera, ma anche le **informazioni perse nel processo di monitoraggio**.

Dove il dato è presente, la visualizzazione è **piena e definita**.  
Dove il dato manca o è parziale, rimangono **sagome, vuoti, assenze visive**.

Le mancanze non ostacolano la comprensione: **la rendono più profonda**, evidenziando la complessità di un fenomeno globale difficile da misurare in modo uniforme.

---

## Struttura e interazione

Dopo una breve introduzione, il sito presenta una **matrice interattiva** che varia in base all’anno selezionato e ai Paesi che contribuiscono maggiormente al dataset.

- Ogni cella rappresenta l’incontro tra **Paese**, **commodity** e **anno**.
- Le **forme piene** indicano dati disponibili.
- La **dimensione** delle forme è proporzionale alla percentuale di spreco.
- Le **sagome** o gli **spazi vuoti** segnalano l’assenza di informazioni.

Ogni vuoto diventa **un invito a cliccare** e a chiedersi *perché* quel dato non esiste.

Dalla visione generale è possibile accedere alla **pagina di dettaglio del singolo Paese**, organizzata per anno e commodity.  
Qui il racconto diventa più concreto:

- i **cestini** visualizzano la perdita alimentare;
- mostrano anche quando questa **non può essere misurata**;
- è possibile osservare la **fase di spreco principale della filiera** e, quando disponibile, anche la **causa principale dello spreco**.

Ogni interazione permette di scoprire non solo quanto cibo viene perso, ma anche **quanto ne resta invisibile**.

---

## Dataset e fonti

Il progetto utilizza il dataset della **FAO – Technical Platform on the Measurement and Reduction of Food Loss and Waste**, la principale piattaforma internazionale sul tema.

Il dataset aggrega dati provenienti da:
- pubblicazioni scientifiche;
- rapporti istituzionali;
- banche dati globali (World Bank, IFPRI, FAOSTAT);
- studi nazionali.

Si tratta di un sistema in continuo aggiornamento, che riflette la **complessità del monitoraggio globale** dello spreco alimentare.

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

**FAO Portal:**  
https://www.fao.org/home/en/

---

## Metodologia progettuale

Per rendere il dataset esplorabile e coerente con gli obiettivi di conoscenza, il gruppo ha:

- selezionato le variabili più rilevanti (colonne *country, commodity, year, loss percentage, food supply stage, cause of loss*);
- **standardizzato i nomi dei Paesi**;
- **raggruppato le commodity in 16 categorie**;
- **raggruppato le cause di perdita in 14 categorie**;
- calcolato la **percentuale media di spreco** per prodotto, Paese e anno;
- individuato **la fase della filiera con maggiore spreco** e, ove possibile, la **causa principale**.

**Dataset rielaborato:**  
https://docs.google.com/spreadsheets/d/1NZWyZyY00FchE5g2odcLVNRNYcSqfYXh57ye09JH8Pk/edit?gid=1460783596#gid=1460783596

---

## Strumenti

- **Excel / Google Sheets**, analisi e riorganizzazione del dataset
- **Google Document**, raccolta idee di base per il concept, opinioni, scambi, testi
- **Miro**, organizzazione concettuale e moodboard
- **Figma**, prototipazione, mockup, prove di visualizzazione 
- **Illustrator / Procreate**, illustrazioni
- **Visual Studio Code**, sviluppo web, codice html, css, JavaScript e p5.js  
- **GitHub**, versionamento e lavoro collaborativo

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
