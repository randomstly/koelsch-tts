/**
 * =============================================================
 *  Kölsch TTS – Modul 1: Übersetzungsengine
 *  translator.js
 * =============================================================
 *
 *  Architektur (sechs Stufen, in dieser Reihenfolge):
 *  0    Wort-Regeln (Pronomen, Partikel, Korrekturen)
 *  0.5  Hilfsverb-Konjugation
 *  0.7  Allgemeine Verbkonjugation
 *  1    Wörterbuch-Lookup (27.585 Einträge, erste Variante)
 *  2    Phonologische Regeln (Fallback für unbekannte Wörter)
 *  3    Markierung [?Wort?] für LLM-Fallback in Modul 3
 *
 *  Der Übergang von Schicht 2 nach Schicht 3 folgt dem
 *  Auslösekriterium aus Arbeitspaket 5, siehe
 *  regelergebnisTauglich().
 *
 *  Zielschreibung der Schicht 2 ist die Schreibung der
 *  Kölsch-Akademie, weil das Wörterbuch der Schicht 1 ihr folgt
 *  und Schicht 1 den weit überwiegenden Teil der Ausgabe traegt.
 *
 *  Abhängigkeiten: woerterbuch.js (muss vorher geladen sein)
 * =============================================================
 */

// ─────────────────────────────────────────────────────────────
//  PHONOLOGISCHE REGELN
//  Aufgebaut aus koelsch_datenbank.xlsx – Phonologische Regeln
//  Priorität 1 = zuerst anwenden, 3 = zuletzt
//
//  STATUS-KOMMENTARE:
//  [OK]     = gut belegt, direkt einsetzbar
//  [PRUEF]  = aus Daten abgeleitet, nach Sprachwiss.-Termin prüfen
//  [FEHLT]  = noch nicht implementiert, nach Termin ergänzen
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
//  HILFSVERB-KONJUGATION
//  Vollständige Paradigmen aller deutschen Hilfsverben → Kölsch
//  Quelle: Kölsch-Akademie Online-Wörterbuch (Rohdaten)
//  Abgedeckt: Präsens, Imperfekt, Konjunktiv II, Infinitive, Partizipien
// ─────────────────────────────────────────────────────────────

const HILFSVERB_KONJUGATION = {"ich habe":"ich han","habe":"han","du hast":"du häs","hast":"häs","er hat":"er hät","hat":"hät","wir haben":"wir han","haben":"han","ihr habt":"ihr hat","habt":"hat","sie haben":"sie han","ich bin":"ich ben","bin":"ben","du bist":"du bes","bist":"bes","er ist":"er es","ist":"es","wir sind":"wir sin","sind":"sin","ihr seid":"ihr sid","seid":"sid","sie sind":"sie sin","ich werde":"ich weed","werde":"weed","du wirst":"du wees","wirst":"wees","er wird":"er weed","wird":"weed","wir werden":"wir weed","ihr werdet":"ihr wäädt","werdet":"wäädt","sie werden":"sie weed","ich kann":"ich kann","kann":"kann","du kannst":"du kanns","kannst":"kanns","er kann":"er kann","wir können":"wir künne","können":"künne","ihr könnt":"ihr künnt","könnt":"künnt","sie können":"sie künne","ich muss":"ich muss","muss":"muss","du musst":"du muss","musst":"muss","er muss":"er muss","wir müssen":"wir müsse","müssen":"müsse","ihr müsst":"ihr mutt","müsst":"mutt","sie müssen":"sie müsse","ich will":"ich well","will":"well","du willst":"du wells","willst":"wells","er will":"er well","wir wollen":"wir wolle","wollen":"wolle","ihr wollt":"ihr wollt","sie wollen":"sie wolle","ich soll":"ich soll","soll":"soll","du sollst":"du solls","sollst":"solls","er soll":"er soll","wir sollen":"wir solle","sollen":"solle","ihr sollt":"ihr sollt","sie sollen":"sie solle","ich darf":"ich darf","darf":"darf","du darfst":"du darfs","darfst":"darfs","er darf":"er darf","wir dürfen":"wir dörfe","dürfen":"dörfe","ihr dürft":"ihr dörft","dürft":"dörft","sie dürfen":"sie dörfe","ich mag":"ich mag","mag":"mag","du magst":"du mags","magst":"mags","er mag":"er mag","wir mögen":"wir möge","mögen":"möge","ihr mögt":"ihr mögt","sie mögen":"sie möge","hatte":"hatt","hattest":"hatts","hatten":"hatte","hattet":"hatt","war":"wor","warst":"wors","waren":"wore","wart":"wort","wurde":"woodt","wurdest":"woodts","wurden":"woodte","wurdet":"woodt","konnte":"kunnt","konntest":"kunnts","konnten":"kunnte","konntet":"kunnt","musste":"moot","musstest":"moots","mussten":"moote","musstet":"moot","wollte":"wollt","wolltest":"wollts","sollte":"sollt","solltest":"sollts","durfte":"dorft","durftest":"dorfts","durften":"dorfte","durftet":"dorft","mochte":"moot","mochtest":"moots","mochten":"moote","mochtet":"moot","gehabt":"gehat","gewesen":"gewäs","geworden":"gewoode","gekonnt":"gekunnt","gemusst":"gemoot","gewollt":"gewollt","gesollt":"gesollt","gedurft":"gedörft","gemocht":"gemoot","wäre":"wör","wärst":"wörs","wären":"wöre","wärt":"wört","hätte":"hätt","hättest":"hätts","hätten":"hätte","hättet":"hätt","würde":"wöödt","würdest":"wöödts","würden":"wöödte","würdet":"wöödt","könnte":"künnt","könntest":"künnts","könnten":"künnte","könntet":"künnt","müsste":"mööt","müsstest":"möödts","müssten":"mööte","müsstet":"mööt","dürfte":"dörft","dürftest":"dörfts","dürften":"dörfte","möchte":"möcht","möchtest":"möchts","möchten":"möchte","möchtet":"möcht","hab":"han","wollt":"wollt","sollt":"sollt","könnt":"künnt","dörft":"dörft","mögt":"mögt"};

const VERB_KONJUGATION = {"abonniere":"abonniere","abonnieree":"abonniere","abonnierst":"abonniers","abonniert":"abonniert","abonnieret":"abonniert","abschiebe":"schiebe av","abschiebee":"schiebe av","abschiebst":"schiebs av","abschiebt":"schieb av","abschiebet":"schieb av","achte":"aachte","achtee":"aachte","achtst":"aachs","achtest":"aachs","achtt":"aach","achtet":"aach","ackere":"ackere","ackerst":"ackers","ackert":"ackert","ackeret":"ackert","addiere":"addiere","addieree":"addiere","addierst":"addiers","addiert":"addiert","addieret":"addiert","ahne":"ahne","ahnee":"ahne","ahst":"ahns","aht":"ahnt","ahet":"ahnt","ängstige":"ängstige","ängstigee":"ängstige","ängstigst":"ängstigs","ängstigt":"ängstig","ängstiget":"ängstig","atme":"odeme","atmee":"odeme","atmst":"odems","atmt":"odemp","atmet":"odemp","backe":"backe","backee":"backe","backst":"backs","backt":"back","backet":"back","bändige":"bändige","bändigee":"bändige","bändigst":"bändigs","bändigt":"bändig","bändiget":"bändig","banne":"banne","bannee":"banne","bast":"banns","bat":"bannt","baet":"bannt","baue":"baue","bauee":"baue","baust":"baus","baut":"baut","bauet":"baut","bebe":"bevve","bebee":"bevve","bebst":"bävs","bebt":"bäv","bebet":"bäv","befehle":"befähle","befehlee":"befähle","befehlst":"befähls","befehlt":"befählt","befehlet":"befählt","behaupte":"behaupte","behauptee":"behaupte","behauptst":"behaups","behauptest":"behaups","behauptt":"behaup","behauptet":"behaup","beiße":"bieße","beißee":"bieße","beißst":"bieß","beißt":"bieß","beißet":"bieß","belaste":"belaste","belastee":"belaste","belastst":"belass","belastest":"belass","belastt":"belass","belastet":"belass","beschwere":"beschwere","beschweree":"beschwere","beschwerst":"beschwers","beschwert":"beschwert","beschweret":"beschwert","bete":"bedde","betee":"bedde","betst":"bedds","betest":"bedds","bett":"bedd","betet":"bedd","betrüge":"bedrege","betrügee":"bedrege","betrügst":"bedrügs","betrügt":"bedrüg","betrüget":"bedrüg","bettele":"kötte","bettelst":"kötts","bettelt":"kött","bettelet":"kött","bewaffne":"bewaffne","bewaffnee":"bewaffne","bewaffst":"bewaffnes","bewafft":"bewaffnet","bewaffet":"bewaffnet","bewege":"bewäge","bewegee":"bewäge","bewegst":"bewägs","bewegt":"bewäg","beweget":"bewäg","biege":"beege","biegee":"beege","biegst":"beegs","biegt":"beeg","bieget":"beeg","biete":"beede","bietee":"beede","bietst":"beeds","bietest":"beeds","biett":"beed","bietet":"beed","binde":"binge","bindee":"binge","bindst":"bings","bindt":"bingk","bindet":"bingk","bitte":"bedde","bittee":"bedde","bittst":"bedds","bittest":"bedds","bittt":"bedd","bittet":"bedd","blaffe":"blaffe","blaffee":"blaffe","blaffst":"blaffs","blafft":"blaff","blaffet":"blaff","blase":"blose","blasee":"blose","blasst":"blies","blast":"blies","blaset":"blies","bleibe":"blieve","bleibee":"blieve","bleibst":"blie(v)s","bleibt":"bliev","bleibet":"bliev","blende":"blende","blendee":"blende","blendst":"blends","blendt":"blend","blendet":"blend","bohre":"bohre","bohree":"bohre","bohrst":"bohrs","bohrt":"bohrt","bohret":"bohrt","brate":"brode","bratee":"brode","bratst":"bröds","bratest":"bröds","bratt":"bröd","bratet":"bröd","brauche":"bruche","brauchee":"bruche","brauchst":"bruchs","braucht":"bruch","brauchet":"bruch","breche":"breche","brechee":"breche","brechst":"brichs","brecht":"brich","brechet":"brich","brenne":"brenne","brennee":"brenne","brst":"brenns","brt":"brennt","bret":"brennt","bringe":"bränge","bringee":"bränge","bringst":"brängs","bringt":"brängk","bringet":"brängk","brühe":"bröhe","brühee":"bröhe","brühst":"bröhs","brüht":"bröht","brühet":"bröht","bürge":"bürge","bürgee":"bürge","bürgst":"bürgs","bürgt":"bürg","bürget":"bürg","bürste":"bööschte","bürstee":"bööschte","bürstst":"bööschs","bürstest":"bööschs","bürstt":"böösch","bürstet":"böösch","büße":"böße","büßee":"böße","büßst":"böß","büßt":"böß","büßet":"böß","dämme":"dämme","dämmee":"dämme","dämmst":"dämms","dämmt":"dämmp","dämmet":"dämmp","danke":"danke","dankee":"danke","dankst":"danks","dankt":"dank","danket":"dank","denke":"denke","denkee":"denke","denkst":"denks","denkt":"denk","denket":"denk","diene":"deene","dienee":"deene","dist":"deens","dit":"deent","diet":"deent","dränge":"dränge","drängee":"dränge","drängst":"drängs","drängt":"drängk","dränget":"drängk","dresche":"dresche","dreschee":"dresche","dreschst":"drischs","drescht":"drisch","dreschet":"drisch","drücke":"däue","drückee":"däue","drückst":"däus","drückt":"däut","drücket":"däut","dünste":"dünste","dünstee":"dünste","dünstst":"düns","dünstest":"düns","dünstt":"düns","dünstet":"düns","dürfe":"darf","dürfee":"darf","dürfst":"darfs","dürft":"darf","dürfet":"darf","eigne":"eigne","eignee":"eigne","eigst":"eignes","eigt":"eignet","eiget":"eignet","ekele":"äkele","ekelst":"äkels","ekelt":"äkelt","ekelet":"äkelt","ende":"ende","endee":"ende","endst":"ends","endt":"end","endet":"end","ernte":"ernte","erntee":"ernte","erntst":"ernts","erntest":"ernts","erntt":"ernt","erntet":"ernt","erzähle":"klaafe","erzählee":"klaafe","erzählst":"klaafs","erzählt":"klaaf","erzählet":"klaaf","esse":"esse","essee":"esse","essst":"iss","esst":"iss","esset":"iss","fahre":"fahre","fahree":"fahre","fahrst":"fäh(r)s","fahrt":"fäht","fahret":"fäht","falle":"falle","fallee":"falle","fallst":"fälls","fallt":"fällt","fallet":"fällt","fälsche":"fälsche","fälschee":"fälsche","fälschst":"fälschs","fälscht":"fälsch","fälschet":"fälsch","falte":"falde","faltee":"falde","faltst":"falds","faltest":"falds","faltt":"fald","faltet":"fald","fange":"fange","fangee":"fange","fangst":"fängs","fangt":"fängk","fanget":"fängk","färbe":"färve","färbee":"färve","färbst":"färvs","färbt":"färv","färbet":"färv","fasse":"fasse","fassee":"fasse","fassst":"fass","fasst":"fass","fasset":"fass","faste":"faste","fastee":"faste","fastst":"fass","fastest":"fass","fastt":"fass","fastet":"fass","fechte":"fäächte","fechtee":"fäächte","fechtst":"fäächs","fechtest":"fäächs","fechtt":"fääch","fechtet":"fääch","fehle":"fähle","fehlee":"fähle","fehlst":"fähls","fehlt":"fählt","fehlet":"fählt","filme":"filme","filmee":"filme","filmst":"films","filmt":"filmp","filmet":"filmp","fixe":"fixe","fixee":"fixe","fixst":"fix","fixt":"fix","fixet":"fix","fliege":"fleege","fliegee":"fleege","fliegst":"flügs","fliegt":"flüg","flieget":"flüg","flöte":"fleute","flötee":"fleute","flötst":"fleuts","flötest":"fleuts","flött":"fleut","flötet":"fleut","foppe":"foppe","foppee":"foppe","foppst":"fopps","foppt":"fopp","foppet":"fopp","frage":"froge","fragee":"froge","fragst":"frögs","fragt":"frög","fraget":"frög","friere":"freere","frieree":"freere","frierst":"free(r)s","friert":"free(r)t","frieret":"free(r)t","fühle":"föhle","fühlee":"föhle","fühlst":"föhls","fühlt":"föhlt","fühlet":"föhlt","führe":"föhre","führee":"föhre","führst":"föhs","führt":"föht","führet":"föht","gebe":"gevve","gebee":"gevve","gebst":"giss","gebt":"gitt","gebet":"gitt","gedeihe":"gedeihe","gedeihee":"gedeihe","gedeihst":"gedeihs","gedeiht":"gedeiht","gedeihet":"gedeiht","gehe":"gonn","gehee":"gonn","gehst":"geihs","geht":"geiht","gehet":"geiht","gelte":"gelde","geltee":"gelde","geltst":"gilds","geltest":"gilds","geltt":"gild","geltet":"gild","gewinne":"gewenne","gewinnee":"gewenne","gewist":"gewenns","gewit":"gewennt","gewiet":"gewennt","gieße":"geeße","gießee":"geeße","gießst":"güüß","gießt":"güüß","gießet":"güüß","gönne":"gönne","gönnee":"gönne","göst":"gönns","göt":"gönnt","göet":"gönnt","grabe":"grave","grabee":"grave","grabst":"grävs","grabt":"gräv","grabet":"gräv","greife":"griefe","greifee":"griefe","greifst":"griefs","greift":"grief","greifet":"grief","grinse":"grinse","grinsee":"grinse","grinsst":"grins","grinst":"grins","grinset":"grins","haare":"hööre","haaree":"hööre","haarst":"höörs","haart":"höört","haaret":"höört","habe":"han","habee":"han","habst":"häs","habt":"hät","habet":"hät","hacke":"hacke","hackee":"hacke","hackst":"hacks","hackt":"hack","hacket":"hack","hafte":"hafte","haftee":"hafte","haftst":"haffs","haftest":"haffs","haftt":"haff","haftet":"haff","halle":"halle","hallee":"halle","hallst":"halls","hallt":"hallt","hallet":"hallt","halte":"halde","haltee":"halde","haltst":"hälds","haltest":"hälds","haltt":"häld","haltet":"häld","hänge":"hange","hängee":"hange","hängst":"hängs","hängt":"hängk","hänget":"hängk","harre":"harre","harree":"harre","harrst":"harrs","harrt":"harrt","harret":"harrt","haue":"haue","hauee":"haue","haust":"haus","haut":"haut","hauet":"haut","hebe":"hevve","hebee":"hevve","hebst":"hivvs","hebt":"hivv","hebet":"hivv","heische":"heische","heischee":"heische","heischst":"heischs","heischt":"heisch","heischet":"heisch","heiße":"heiße","heißee":"heiße","heißst":"heiß","heißt":"heiß","heißet":"heiß","helfe":"helfe","helfee":"helfe","helfst":"hilfs","helft":"hilf","helfet":"hilf","heule":"hüüle","heulee":"hüüle","heulst":"hüüls","heult":"hüült","heulet":"hüült","hole":"holle","holee":"holle","holst":"hölls","holt":"höllt","holet":"höllt","huste":"hoste","hustee":"hoste","hustst":"hos","hustest":"hos","hustt":"hos","hustet":"hos","impfe":"imfe","impfee":"imfe","impfst":"imfs","impft":"imf","impfet":"imf","jage":"jage","jagee":"jage","jagst":"jags","jagt":"jag","jaget":"jag","kämpfe":"kämfe","kämpfee":"kämfe","kämpfst":"kämfs","kämpft":"kämf","kämpfet":"kämf","karte":"kaate","kartee":"kaate","kartst":"kaats","kartest":"kaats","kartt":"kaat","kartet":"kaat","kaufe":"kaufe","kaufee":"kaufe","kaufst":"käufs","kauft":"käuf","kaufet":"käuf","kehre":"kehre","kehree":"kehre","kehrst":"kehrs","kehrt":"kehrt","kehret":"kehrt","keife":"kieve","keifee":"kieve","keifst":"kievs","keift":"kiev","keifet":"kiev","kläre":"kläre","kläree":"kläre","klärst":"klärs","klärt":"klärt","kläret":"klärt","klettere":"klemme","kletterst":"klemms","klettert":"klemmp","kletteret":"klemmp","klimme":"klemme","klimmee":"klemme","klimmst":"klemms","klimmt":"klemmp","klimmet":"klemmp","knete":"knedde","knetee":"knedde","knetst":"knedds","knetest":"knedds","knett":"knedd","knetet":"knedd","komme":"kumme","kommee":"kumme","kommst":"küss","kommt":"kütt","kommet":"kütt","könne":"kann","könnee":"kann","köst":"kanns","köt":"kann","köet":"kann","krame":"krome","kramee":"krome","kramst":"kroms","kramt":"kromp","kramet":"kromp","kratze":"kratze","kratzee":"kratze","kratzst":"kratz","kratzt":"kratz","kratzet":"kratz","krieche":"kreeche","kriechee":"kreeche","kriechst":"kreechs","kriecht":"kreech","kriechet":"kreech","kriege":"krige","kriegee":"krige","kriegst":"kriss","kriegt":"kritt","krieget":"kritt","kürze":"kööze","kürzee":"kööze","kürzst":"kööz","kürzt":"kööz","kürzet":"kööz","lache":"laache","lachee":"laache","lachst":"laachs","lacht":"laach","lachet":"laach","lade":"lade","ladee":"lade","ladst":"läds","ladt":"läd","ladet":"läd","lahme":"lahme","lahmee":"lahme","lahmst":"lahms","lahmt":"lahmp","lahmet":"lahmp","lärme":"lärme","lärmee":"lärme","lärmst":"lärms","lärmt":"lärmp","lärmet":"lärmp","lasse":"looße","lassee":"looße","lassst":"lööß","lasst":"lööt","lasset":"lööt","laufe":"laufe","laufee":"laufe","laufst":"läufs","lauft":"läuf","laufet":"läuf","lebe":"levve","lebee":"levve","lebst":"lävs","lebt":"läv","lebet":"läv","lege":"läge","legee":"läge","legst":"lägs","legt":"läg","leget":"läg","lehre":"lehre","lehree":"lehre","lehrst":"lehs","lehrt":"leht","lehret":"leht","leide":"ligge","leidee":"ligge","leidst":"liggs","leidt":"ligg","leidet":"ligg","lese":"lese","lesee":"lese","lesst":"liss","lest":"liss","leset":"liss","leuchte":"leuchte","leuchtee":"leuchte","leuchtst":"leuchs","leuchtest":"leuchs","leuchtt":"leuch","leuchtet":"leuch","liege":"lige","liegee":"lige","liegst":"liss","liegt":"litt","lieget":"litt","lüge":"lege","lügee":"lege","lügst":"lügs","lügt":"lüg","lüget":"lüg","mache":"maache","machee":"maache","machst":"mähs","macht":"mäht","machet":"mäht","meide":"meide","meidee":"meide","meidst":"meids","meidt":"meid","meidet":"meid","meine":"meine","meinee":"meine","meist":"meins","meit":"meint","meiet":"meint","melke":"melke","melkee":"melke","melkst":"melks","melkt":"melk","melket":"melk","möge":"mag","mögee":"mag","mögst":"mags","mögt":"mag","möget":"mag","müsse":"muss","müssee":"muss","müssst":"muss","müsst":"muss","müsset":"muss","nehme":"nemme","nehmee":"nemme","nehmst":"nimms","nehmt":"nimmp","nehmet":"nimmp","ordne":"oodene","ordnee":"oodene","ordst":"oodens","ordt":"oodent","ordet":"oodent","plane":"plane","planee":"plane","plast":"plans","plat":"plant","plaet":"plant","preise":"priese","preisee":"priese","preisst":"pries","preist":"pries","preiset":"pries","prüfe":"pröfe","prüfee":"pröfe","prüfst":"pröfs","prüft":"pröf","prüfet":"pröf","pumpe":"pumpe","pumpee":"pumpe","pumpst":"pumps","pumpt":"pump","pumpet":"pump","quäle":"quäle","quälee":"quäle","quälst":"quäls","quält":"quält","quälet":"quält","rase":"rase","rasee":"rase","rasst":"ras","rast":"ras","raset":"ras","räume":"rüüme","räumee":"rüüme","räumst":"rüüms","räumt":"rüümp","räumet":"rüümp","rechne":"rechne","rechnee":"rechne","rechst":"rechens","recht":"rechent","rechet":"rechent","rette":"rette","rettee":"rette","rettst":"retts","rettest":"retts","rettt":"rett","rettet":"rett","richte":"reechte","richtee":"reechte","richtst":"reechs","richtest":"reechs","richtt":"reech","richtet":"reech","rieche":"ruche","riechee":"ruche","riechst":"ruchs","riecht":"ruch","riechet":"ruch","rufe":"rofe","rufee":"rofe","rufst":"röfs","ruft":"röf","rufet":"röf","rüste":"röste","rüstee":"röste","rüstst":"röss","rüstest":"röss","rüstt":"röss","rüstet":"röss","sage":"sage","sagee":"sage","sagst":"sähs","sagt":"säht","saget":"säht","saufe":"suffe","saufee":"suffe","saufst":"süffs","sauft":"süff","saufet":"süff","schabe":"schave","schabee":"schave","schabst":"schavs","schabt":"schav","schabet":"schav","schaffe":"schaffe","schaffee":"schaffe","schaffst":"schaffs","schafft":"schaff","schaffet":"schaff","schaue":"loore","schauee":"loore","schaust":"loos","schaut":"loot","schauet":"loot","scheide":"scheide","scheidee":"scheide","scheidst":"scheids","scheidt":"scheid","scheidet":"scheid","scheiße":"scheiße","scheißee":"scheiße","scheißst":"scheiß","scheißt":"scheiß","scheißet":"scheiß","schimpfe":"schänge","schimpfee":"schänge","schimpfst":"schängs","schimpft":"schängk","schimpfet":"schängk","schlafe":"schlofe","schlafee":"schlofe","schlafst":"schlöfs","schlaft":"schlöf","schlafet":"schlöf","schlage":"schlonn","schlagee":"schlonn","schlagst":"schleihs","schlagt":"schleiht","schlaget":"schleiht","schleiche":"schleiche","schleichee":"schleiche","schleichst":"schleichs","schleicht":"schleich","schleichet":"schleich","schmecke":"schmecke","schmeckee":"schmecke","schmeckst":"schmecks","schmeckt":"schmeck","schmecket":"schmeck","schmelze":"schmelze","schmelzee":"schmelze","schmelzst":"schmilzs","schmelzt":"schmilz","schmelzet":"schmilz","schnüre":"schnöre","schnüree":"schnöre","schnürst":"schnörs","schnürt":"schnört","schnüret":"schnört","schrappe":"schrabbe","schrappee":"schrabbe","schrappst":"schrabbs","schrappt":"schrabb","schrappet":"schrabb","schütte":"schödde","schüttee":"schödde","schüttst":"schödds","schüttest":"schödds","schüttt":"schödd","schüttet":"schödd","schweige":"schweige","schweigee":"schweige","schweigst":"schweigs","schweigt":"schweig","schweiget":"schweig","schwimme":"schwemme","schwimmee":"schwemme","schwimmst":"schwemms","schwimmt":"schwemmp","schwimmet":"schwemmp","schwitze":"schweißte","schwitzee":"schweißte","schwitzst":"schweiß","schwitzt":"schweiß","schwitzet":"schweiß","schwöre":"schwöre","schwöree":"schwöre","schwörst":"schwörs","schwört":"schwört","schwöret":"schwört","sehe":"soh","sehee":"soh","sehst":"sohs","seht":"soh","sehet":"soh","sende":"sende","sendee":"sende","sendst":"sends","sendt":"send","sendet":"send","sitze":"setze","sitzee":"setze","sitzst":"sitz","sitzt":"sitz","sitzet":"sitz","solle":"soll","sollee":"soll","sollst":"solls","sollt":"soll","sollet":"soll","sorge":"sorge","sorgee":"sorge","sorgst":"sorgs","sorgt":"sorg","sorget":"sorg","spuke":"spoke","spukee":"spoke","spukst":"spoks","spukt":"spok","spuket":"spok","spüle":"spöle","spülee":"spöle","spülst":"spöls","spült":"spölt","spület":"spölt","spüre":"spöre","spüree":"spöre","spürst":"spöös","spürt":"spööt","spüret":"spööt","stampfe":"stampe","stampfee":"stampe","stampfst":"stamps","stampft":"stamp","stampfet":"stamp","stehe":"stonn","stehee":"stonn","stehst":"steihs","steht":"steiht","stehet":"steiht","stehle":"stelle","stehlee":"stelle","stehlst":"stills","stehlt":"stillt","stehlet":"stillt","steige":"steige","steigee":"steige","steigst":"steigs","steigt":"steig","steiget":"steig","stelle":"stelle","stellee":"stelle","stellst":"stells","stellt":"stellt","stellet":"stellt","sterbe":"sterve","sterbee":"sterve","sterbst":"stirvs","sterbt":"stirv","sterbet":"stirv","stöhne":"küüme","stöhnee":"küüme","stöhst":"küüms","stöht":"küümp","stöhet":"küümp","stoße":"stüsse","stoßee":"stüsse","stoßst":"stüss","stoßt":"stüss","stoßet":"stüss","streiche":"striche","streichee":"striche","streichst":"strichs","streicht":"strich","streichet":"strich","suche":"söke","suchee":"söke","suchst":"söks","sucht":"sök","suchet":"sök","tanze":"danze","tanzee":"danze","tanzst":"danz","tanzt":"danz","tanzet":"danz","taue":"düüe","tauee":"düüe","taust":"düüs","taut":"düüt","tauet":"düüt","teile":"deile","teilee":"deile","teilst":"deils","teilt":"deilt","teilet":"deilt","trabe":"trabe","trabee":"trabe","trabst":"trabs","trabt":"trab","trabet":"trab","trage":"drage","tragee":"drage","tragst":"drähs","tragt":"dräht","traget":"dräht","trauere":"troore","trauerst":"troos","trauert":"troot","traueret":"troot","treffe":"treffe","treffee":"treffe","treffst":"triffs","trefft":"triff","treffet":"triff","treibe":"drieve","treibee":"drieve","treibst":"drievs","treibt":"driev","treibet":"driev","trete":"tredde","tretee":"tredde","tretst":"tridds","tretest":"tridds","trett":"tridd","tretet":"tridd","trinke":"drinke","trinkee":"drinke","trinkst":"drinks","trinkt":"drink","trinket":"drink","turne":"turne","turnee":"turne","turst":"turns","turt":"turnt","turet":"turnt","verarzte":"veraazte","verarztee":"veraazte","verarztst":"veraaz","verarztest":"veraaz","verarztt":"veraaz","verarztet":"veraaz","verliere":"verliere","verlieree":"verliere","verlierst":"verliers","verliert":"verliert","verlieret":"verliert","wachse":"wahße","wachsee":"wahße","wachsst":"wähß","wachst":"wähß","wachset":"wähß","warte":"waade","wartee":"waade","wartst":"waads","wartest":"waads","wartt":"waad","wartet":"waad","wasche":"wäsche","waschee":"wäsche","waschst":"wischs","wascht":"wisch","waschet":"wisch","wate":"wate","watee":"wate","watst":"wats","watest":"wats","watt":"wat","watet":"wat","wehre":"wehre","wehree":"wehre","wehrst":"wehrs","wehrt":"wehrt","wehret":"wehrt","weiche":"weiche","weichee":"weiche","weichst":"weichs","weicht":"weich","weichet":"weich","weine":"kriesche","weinee":"kriesche","weist":"krieschs","weit":"kriesch","weiet":"kriesch","weise":"wiese","weisee":"wiese","weisst":"wies","weiset":"wies","weite":"wigge","weitee":"wigge","weitst":"wiggs","weitest":"wiggs","weitt":"wigg","weitet":"wigg","wende":"wende","wendee":"wende","wendst":"wends","wendt":"wend","wendet":"wend","werde":"wääde","werdee":"wääde","werdst":"wees","werdt":"weed","werdet":"weed","werfe":"werfe","werfee":"werfe","werfst":"wirfs","werft":"wirf","werfet":"wirf","wiege":"weege","wiegee":"weege","wiegst":"weegs","wiegt":"weeg","wieget":"weeg","winde":"winde","windee":"winde","windst":"winds","windt":"wind","windet":"wind","wisse":"weiß","wissee":"weiß","wissst":"weiß","wisst":"weiß","wisset":"weiß","wolle":"well","wollee":"well","wollst":"wells","wollt":"well","wollet":"well","ziehe":"trecke","ziehee":"trecke","ziehst":"tricks","zieht":"trick","ziehet":"trick","arbeite":"arbeide","arbeitest":"arbeidest","arbeitet":"arbeided","arbeitete":"arbeide","gearbeitet":"jearbodd","hause":"Huus","läuft":"läuf","schläft":"schlöf","fährt":"fährt","sieht":"süht","gibt":"gevv","nimmt":"nemmp","hält":"häld","findet":"findt","schreibt":"schriev","liest":"lühs","spricht":"spreche","versteht":"verstonn","gefällt":"jefällt","weiß":"weiß","kennt":"kennt","ging":"ging","kam":"kom","trank":"drunk","sah":"soh","lief":"leef","schlief":"schleef","fuhr":"foor","nahm":"nahm","gab":"jov","hielt":"hiel","stand":"stonn","saß":"saß","lachte":"laachte","dachte":"dachte","brachte":"brachte","fand":"fund","schrieb":"schriev","las":"las","sprach":"sproch","verstand":"verstonn"};

const PHONOLOGISCHE_REGELN = [

  // ── PRIORITÄT 1: Wörter (Vollformen) ──────────────────────
  // Diese zuerst, damit keine Regel-Kollisionen entstehen

  // [OK] Pronomen & Partikel – konstitutiv, keine Ausnahmen
  { von: /\bwir\b/gi,     zu: "mir",    typ: "wort",    status: "ok" },
  { von: /\ber\b/gi,      zu: "hä",     typ: "wort",    status: "ok" },
  { von: /\bes\b/gi,      zu: "et",     typ: "wort",    status: "ok" },
  { von: /\bdas\b/gi,     zu: "dat",    typ: "wort",    status: "ok" },
  { von: /\bsie\b/gi,     zu: "se",     typ: "wort",    status: "ok" },  // Plural/Sg.fem.
  { von: /\bihr\b/gi,     zu: "ehr",    typ: "wort",    status: "ok" },
  { von: /\bnicht\b/gi,   zu: "nit",    typ: "wort",    status: "ok" },
  { von: /\bauch\b/gi,    zu: "och",    typ: "wort",    status: "ok" },
  { von: /\bmal\b/gi,     zu: "ens",    typ: "wort",    status: "ok" },
  { von: /\bund\b/gi,     zu: "un",     typ: "wort",    status: "ok" },

  // [OK] Häufige Wörter die im Wörterbuch falsch oder mehrdeutig sind
  // Explizit hier gesetzt damit sie nicht durch Wörterbuch-Fehler überschrieben werden
  { von: /\bso\b/gi,      zu: "su",     typ: "wort",    status: "ok" },  // "so" → Südost im Wb!
  { von: /\bein\b/gi,     zu: "en",     typ: "wort",    status: "ok" },  // fehlt im Wb
  { von: /\bals\b/gi,     zu: "als",    typ: "wort",    status: "ok" },  // bleibt
  { von: /\bhä\b/gi,      zu: "hä",     typ: "wort",    status: "ok" },  // kölsch "hä" als Eingabe
  { von: /\bmir\b/gi,     zu: "mir",    typ: "wort",    status: "ok" },  // kölsch "mir" als Eingabe
  { von: /\bdu\b/gi,      zu: "do",     typ: "wort",    status: "ok" },  // du → do

  // [FEHLT] Artikel – nach Sprachwiss.-Termin ergänzen
  // TODO: { von: /\bdie\b/gi, zu: "de", ... }
  // TODO: { von: /\bdem\b/gi, zu: "dämm", ... }
  // TODO: { von: /\bein\b/gi, zu: "en", ... }  (mask.)
  // TODO: { von: /\beine\b/gi, zu: "en", ... } (fem.)

  // ── PRIORITÄT 1: Präfixe ──────────────────────────────────
  // Produktive Regeln. Belegwert = Anteil der Kognatenpaare des
  // Kölsch-Akademie-Wörterbuchs, bei denen die Regel die Form
  // naeher an die Zielform heranfuehrt, abzueglich der Faelle, in
  // denen sie sie entfernt (Grundgesamtheit: 20.482 Kognatenpaare).

  { von: /\bab([a-zäöüß]+)/gi,  zu: "av$1",  typ: "praefix", status: "ok", prio: 1, nr: 21,   block: "A",   beleg: "n=399, +93,5 %",  quelle: "Kölsch-Akademie", bedingung: restImLexikon(2) },
  { von: /\bauf([a-zäöüß]+)/gi, zu: "op$1",  typ: "praefix", status: "ok", prio: 1, nr: 22,   block: "A",   beleg: "n=103, +93,2 %",  quelle: "Kölsch-Akademie", bedingung: restImLexikon(3) },
  { von: /\baus([a-zäöüß]+)/gi, zu: "us$1",  typ: "praefix", status: "ok", prio: 1, nr: 23,   block: "A",   beleg: "n=308, +98,1 %",  quelle: "Kölsch-Akademie", bedingung: restImLexikon(3) },
  { von: /\bvor([a-zäöüß]+)/gi, zu: "vör$1", typ: "praefix", status: "ok", prio: 1, nr: 24,   block: "A",   beleg: "n=231, +87,4 %",  quelle: "Kölsch-Akademie", bedingung: restImLexikon(3) },
  { von: /\büber/gi,            zu: "övver", typ: "praefix", status: "ok", prio: 1, nr: 33,   block: "A",   beleg: "n=183, +100,0 %", quelle: "Kölsch-Akademie" },

  // Block B – aus den Daten abgeleitet, sprachwissenschaftlich ungeprueft
  { von: /\ban([a-zäöüß]+)/gi,  zu: "aan$1", typ: "praefix", status: "ok", prio: 1, nr: 40,   block: "B",   beleg: "n=347, +81,3 %", quelle: "abgeleitet, ungeprueft", bedingung: restImLexikon(2) },

  // Neu abgeleitet – im Datenbankblatt nicht als Praefixregel gefuehrt
  { von: /\bein([a-zäöüß]+)/gi, zu: "en$1",  typ: "praefix", status: "ok", prio: 1, nr: null, block: "neu", beleg: "n=366, +79,0 %", quelle: "abgeleitet, ungeprueft", bedingung: restImLexikon(3) },

  // ── PRIORITÄT 2: Endungen (spezifisch vor allgemein) ──────
  // Reihenfolge ist bindend: -ieren muss vor -en laufen, sonst
  // greift -en zuerst und -ieren kommt nicht mehr zum Zug.

  // Auslautregeln zuerst, danach die Apokope des -e, zuletzt -en -> -e.
  // Diese Reihenfolge ist bindend: liefe die -e-Tilgung nach -en -> -e,
  // wuerde sie das eben erzeugte -e wieder entfernen (abbaue -> abbau).

  { von: /cht\b/gi,                zu: "ch", typ: "auslaut", status: "ok", prio: 2, nr: null, block: "neu", beleg: "n=338, +96,2 %",   quelle: "abgeleitet, ungeprueft" },
  { von: /s?st\b/gi,               zu: "ss", typ: "auslaut", status: "ok", prio: 2, nr: null, block: "neu", beleg: "n=746, +41,0 %",   quelle: "abgeleitet, ungeprueft" },
  { von: /([^aeiouäöüch])t\b/gi,   zu: "$1", typ: "auslaut", status: "ok", prio: 2, nr: null, block: "neu", beleg: "n=2.276, +30,4 %", quelle: "abgeleitet, ungeprueft", tilgung: true },
  { von: /b\b/gi,                  zu: "v",  typ: "auslaut", status: "ok", prio: 2, nr: 30,   block: "A",   beleg: "n=85, +38,8 %",    quelle: "Kölsch-Akademie" },
  { von: /e\b/gi,                  zu: "",   typ: "endung",  status: "ok", prio: 2, nr: null, block: "neu", beleg: "n=3.096, +61,8 %", quelle: "abgeleitet, ungeprueft", bedingung: w => w.length >= 5, tilgung: true },
  { von: /ieren\b/gi,              zu: "iere", typ: "endung", status: "ok", prio: 2, nr: 28,  block: "A",   beleg: "n=265, +99,2 %",   quelle: "Kölsch-Akademie" },
  { von: /en\b/gi,                 zu: "e",    typ: "endung", status: "ok", prio: 2, nr: 9,   block: "A",   beleg: "n=5.458, +97,5 %", quelle: "Wrede / Kölsch-Akademie" },

  // ── PRIORITÄT 3: Konsonanten und Vokale ───────────────────

  { von: /itt/gi, zu: "edd", typ: "leniierung", status: "ok", prio: 3, nr: null, block: "neu", beleg: "n=240, +56,7 %", quelle: "abgeleitet, ungeprueft" },
  { von: /pf/gi, zu: "p",  typ: "konsonant",  status: "ok", prio: 3, nr: 13, block: "A", beleg: "n=609, +18,1 %", quelle: "Wrede" },
  { von: /tt/gi, zu: "dd", typ: "leniierung", status: "ok", prio: 3, nr: 25, block: "A", beleg: "n=849, +6,8 %",  quelle: "Kölsch-Akademie" },

  // Block B – aus den Daten abgeleitet, sprachwissenschaftlich ungeprueft
  { von: /ü/gi,  zu: "ö",  typ: "vokal",      status: "ok", prio: 3, nr: 38, block: "B", beleg: "n=1.764, +17,7 %", quelle: "abgeleitet, ungeprueft" },


  // ─────────────────────────────────────────────────────────────
  //  INAKTIV – gemessen, aber gegen die Zielschreibung gerichtet
  //  Diese Regeln bilden die DMW-Notation (Wrede) ab, nicht die
  //  Schreibung der Kölsch-Akademie, auf der das Wörterbuch der
  //  Schicht 1 beruht. Gegen die Akademie-Schreibung verschlechtern
  //  sie die Form; gegen die DMW-Reizwortliste verbessern sie sie.
  //  Sie bleiben dokumentiert, damit die Messung nachvollziehbar ist.
  // ─────────────────────────────────────────────────────────────

  { von: /\bg([aeiouäöüh])/gi, zu: "j$1", typ: "anlaut",     status: "inaktiv", prio: 2, nr: 1,  block: "A", beleg: "Akademie n=658, -99,5 % | DMW n=17, +100,0 %", quelle: "Wrede" },
  { von: /\bsp/gi,  zu: "schp", typ: "anlaut",      status: "inaktiv", prio: 2, nr: 11, block: "A", beleg: "Akademie n=346, -100,0 % | DMW n=1, +100,0 %", quelle: "Wrede" },
  { von: /\bst/gi,  zu: "scht", typ: "anlaut",      status: "inaktiv", prio: 2, nr: 12, block: "A", beleg: "Akademie n=659, -100,0 % | DMW n=0", quelle: "Wrede" },
  { von: /g\b/gi,   zu: "ch",   typ: "auslaut",     status: "inaktiv", prio: 2, nr: 2,  block: "A", beleg: "Akademie n=803, -99,8 % | DMW n=7, -42,9 %", quelle: "Wrede" },
  { von: /t\b/gi,   zu: "d",    typ: "auslaut",     status: "inaktiv", prio: 2, nr: 29, block: "A", beleg: "Akademie n=2.873, -15,2 % | DMW n=50, -50,0 %", quelle: "Kölsch-Akademie" },
  { von: /pp/gi,    zu: "bb",   typ: "leniierung",  status: "inaktiv", prio: 3, nr: 26, block: "A", beleg: "Akademie n=380, -77,4 %", quelle: "Kölsch-Akademie" },
  { von: /au/gi,    zu: "uu",   typ: "vokal",       status: "inaktiv", prio: 3, nr: 27, block: "A", beleg: "Akademie n=1.718, -27,1 %", quelle: "Kölsch-Akademie" },
  { von: /ie/gi,    zu: "ee",   typ: "vokal",       status: "inaktiv", prio: 3, nr: 31, block: "A", beleg: "Akademie n=1.899, -36,6 %", quelle: "Kölsch-Akademie" },
  { von: /ei/gi,    zu: "ie",   typ: "vokal",       status: "inaktiv", prio: 3, nr: 32, block: "A", beleg: "Akademie n=3.072, -46,9 %", quelle: "Kölsch-Akademie" },

  // [FEHLT] Block C des Datenbankblatts (Nr. 46-60): Artikel, Verb-
  // konjugation, Perfekt, Konjunktiv, Diminutiv, Plural, Adjektiv-
  // deklination, nd -> nn. Nicht aufgenommen.
];


// ─────────────────────────────────────────────────────────────
//  HILFSFUNKTIONEN
// ─────────────────────────────────────────────────────────────

/**
 * Prüft ob ein Wort ein Substantiv ist (Großbuchstabe am Anfang
 * UND kein Satzanfang).
 * Vereinfachte Heuristik – nach Sprachwiss.-Termin verfeinern.
 */
function istSubstantiv(wort, istSatzanfang) {
  if (istSatzanfang) return false;
  return wort.length > 1 && wort[0] === wort[0].toUpperCase()
                         && wort[0] !== wort[0].toLowerCase();
}

/**
 * Passt Groß-/Kleinschreibung der Übersetzung an:
 * - Substantive → Großbuchstabe am Anfang
 * - Satzanfang  → Großbuchstabe am Anfang
 * - Rest        → Kleinbuchstaben
 */
function passeSchreibungAn(koelsch, originalWort, istSatzanfang) {
  if (!koelsch || koelsch.length === 0) return koelsch;

  const sollGross = istSatzanfang || istSubstantiv(originalWort, istSatzanfang);

  if (sollGross) {
    return koelsch.charAt(0).toUpperCase() + koelsch.slice(1);
  } else {
    return koelsch.charAt(0).toLowerCase() + koelsch.slice(1);
  }
}

/**
 * Bedingung fuer die Praefixregeln: Die Regel greift nur, wenn der
 * Rest hinter dem Praefix selbst ein Eintrag des Woerterbuchs oder
 * eine bekannte Verbform ist. Ohne diese Bedingung greifen die
 * Praefixregeln auch auf Woerter wie "abonnieren" oder "Anarchist",
 * bei denen "ab" bzw. "an" kein Praefix ist.
 * Belegt an den Kognatenpaaren: ohne Bedingung +88,3 %, mit
 * Bedingung +97,7 % bei 82 % der bisherigen Treffermenge.
 */
function restImLexikon(laenge) {
  return function (wort) {
    const rest = wort.slice(laenge);
    if (rest.length < 2) return false;
    if (typeof KOELSCH_WOERTERBUCH !== "undefined" && KOELSCH_WOERTERBUCH[rest]) return true;
    if (typeof VERB_KONJUGATION !== "undefined" && VERB_KONJUGATION[rest]) return true;
    // auch die unflektierte Grundform pruefen: "baue" -> "bauen"
    if (typeof KOELSCH_WOERTERBUCH !== "undefined" && KOELSCH_WOERTERBUCH[rest + "n"]) return true;
    // Partizipien: "abgenommen", "ausgeholt" - der Rest beginnt mit "ge"
    // und steht als solcher in keinem Woerterbuch.
    if (rest.startsWith("ge") && rest.length > 4) return true;
    return false;
  };
}

/**
 * Wendet alle aktiven phonologischen Regeln auf ein Wort an.
 * Nur Regeln mit status "ok" werden angewendet.
 * Regeln mit status "pruefen" oder "fehlt" sind auskommentiert.
 */
function wendeRegelnAn(wort, spur, gefeuert) {
  let ergebnis = wort.toLowerCase();

  // Reihenfolge: Prioritaet 1 zuerst, innerhalb einer Prioritaet die
  // Reihenfolge des Arrays (dort steht die spezifischere Regel vorn,
  // z. B. -ieren vor -en). Wortregeln laufen bereits in Schicht 0 und
  // bleiben hier aussen vor.
  const aktive = PHONOLOGISCHE_REGELN
    .filter(r => r.status === "ok" && r.typ !== "wort")
    .map((r, i) => ({ r, i }))
    .sort((a, b) => (a.r.prio - b.r.prio) || (a.i - b.i))
    .map(x => x.r);

  for (const regel of aktive) {
    if (regel.bedingung && !regel.bedingung(ergebnis)) continue;
    const vorher = ergebnis;
    ergebnis = ergebnis.replace(regel.von, regel.zu);
    if (ergebnis !== vorher) {
      if (spur) spur.push(regel.nr !== null && regel.nr !== undefined ? "Nr. " + regel.nr : regel.typ);
      if (gefeuert) gefeuert.push(regel);
    }
  }

  return ergebnis;
}

/**
 * Tokenisiert einen Text in Wörter und Nicht-Wörter (Leerzeichen,
 * Satzzeichen, Zeilenumbrüche). Bewahrt die Position.
 */
function tokenisiere(text) {
  // Teilt in: Wörter (inkl. Umlaute) und Trennzeichen
  return text.match(/[a-zA-ZäöüÄÖÜß]+|[^a-zA-ZäöüÄÖÜß]+/g) || [];
}

/**
 * Prüft ob ein Token ein Satzanfang ist (vorheriges Zeichen war
 * ein Satzende-Zeichen oder es ist das erste Token).
 */
function pruefesSatzanfang(tokens, index) {
  if (index === 0) return true;
  // Suche rückwärts nach letztem Nicht-Leerzeichen-Token
  for (let i = index - 1; i >= 0; i--) {
    const t = tokens[i].trim();
    if (t.length > 0) {
      return /[.!?]$/.test(t);
    }
  }
  return true;
}


// ─────────────────────────────────────────────────────────────
//  AUSLÖSEKRITERIUM SCHICHT 2 → MODUL 3  (Arbeitspaket 5)
// ─────────────────────────────────────────────────────────────
// Schicht 2 gibt ihre Form nur dann an Modul 2 weiter, wenn die
// Regelwirkung als Übersetzung taugt. Andernfalls übernimmt das
// Sprachmodell. Drei Bedingungen, alle müssen erfüllt sein:
//
//  B1  Mindestens eine Regel hat das Wort verändert.
//  B2  Die Wirkung besteht nicht allein in der Tilgung einer
//      deutschen Flexionsendung, die eine im Wörterbuch geführte
//      deutsche Grundform übrig lässt. Sonst wird aus "Hunde" ein
//      "hund": orthographisch plausibel, grammatisch falsch, und
//      das Sprachmodell wäre die bessere Instanz.
//  B3  Es hat mindestens eine Regel der Priorität 1 oder 2
//      gegriffen. Priorität-3-Regeln wirken im Wortinneren und
//      sagen über den Rest des Wortes nichts aus; sie allein sind
//      kein Beleg dafür, dass eine kölsche Form entstanden ist.
//
// Belegt an den Kognatenpaaren der Kölsch-Akademie: Unter diesem
// Kriterium treffen die in Schicht 2 verbleibenden Formen zu
// 34,3 % exakt (vorher 32,5 %) bei einem mittleren Editierabstand
// von 1,22 (vorher 1,28); die abgegebenen Formen treffen zu
// 19,9 % bei einem Abstand von 1,62.

function istBekanntesStichwort(wort) {
  const k = String(wort).toLowerCase();
  if (typeof KOELSCH_WOERTERBUCH !== "undefined" && KOELSCH_WOERTERBUCH[k]) return true;
  if (typeof VERB_KONJUGATION !== "undefined" && VERB_KONJUGATION[k]) return true;
  if (typeof HILFSVERB_KONJUGATION !== "undefined" && HILFSVERB_KONJUGATION[k]) return true;
  return false;
}

function regelergebnisTauglich(form, gefeuert) {
  if (!gefeuert || gefeuert.length === 0) {
    return { tauglich: false, grund: "keine Regel hat gegriffen" };
  }
  if (gefeuert.every(r => r.tilgung === true) && istBekanntesStichwort(form)) {
    return { tauglich: false, grund: "nur Endungstilgung, Ergebnis ist deutsches Stichwort" };
  }
  if (gefeuert.every(r => r.prio === 3)) {
    return { tauglich: false, grund: "nur Regel der Priorität 3" };
  }
  return { tauglich: true, grund: null };
}


// ─────────────────────────────────────────────────────────────
//  KERN-ÜBERSETZUNGSFUNKTION
// ─────────────────────────────────────────────────────────────

/**
 * Übersetzt einen deutschen Text ins Kölsche.
 *
 * @param {string} text - Deutscher Eingabetext
 * @returns {object} {
 *   uebersetzung: string,       // Kölscher Ausgabetext
 *   statistik: {
 *     gesamt:    number,        // Anzahl Wörter gesamt
 *     woerterb:  number,        // Direkte Wörterbuch-Treffer
 *     regeln:    number,        // Über Regeln übersetzt
 *     unbekannt: number         // Nicht übersetzt [?..?]
 *   },
 *   unbekannteWoerter: string[], // Liste aller unbekannten Wörter
 *   varianten: [{ wort, gewaehlt, weitere[] }] // verworfene Mehrfachformen
 * }
 */

// ─────────────────────────────────────────────────────────────
//  VARIANTENAUSWAHL (Schicht 1)
// ─────────────────────────────────────────────────────────────
// Rund 1.000 der 27.585 Wörterbucheinträge führen mehrere kölsche
// Formen in einem Feld, getrennt durch "/" oder ";".
// Modul 2 benötigt je Eingabewort genau eine Schreibform.
// Gewählt wird die erste Form, weil die Reihenfolge der Formen aus
// dem Online-Wörterbuch der Kölsch-Akademie stammt und damit eine
// benennbare Quelle hat. Die übrigen Formen gehen nicht verloren,
// sondern werden als Nebeninformation zurückgegeben.
function waehleVariante(wert) {
  const teile = String(wert)
    .split(/[\/;]/)
    .map(t => t.trim())
    .filter(t => t !== "");

  if (teile.length === 0) {
    return { gewaehlt: String(wert).trim(), weitere: [] };
  }
  return { gewaehlt: teile[0], weitere: teile.slice(1) };
}

function uebersetze(text) {

  if (!text || text.trim() === "") {
    return { uebersetzung: "", statistik: { gesamt:0, woerterb:0, regeln:0, unbekannt:0 }, unbekannteWoerter: [], varianten: [], regelTreffer: [], regelAbgewiesen: [] };
  }

  const tokens       = tokenisiere(text);
  const ergebnisse   = [];
  const unbekannte   = [];
  const varianten    = [];
  const regelTreffer = [];
  const regelAbgewiesen = [];
  const statistik    = { gesamt: 0, woerterb: 0, regeln: 0, unbekannt: 0 };

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    // Kein Wort (Leerzeichen, Satzzeichen) → unverändert übernehmen
    if (!/[a-zA-ZäöüÄÖÜß]/.test(token)) {
      ergebnisse.push(token);
      continue;
    }

    statistik.gesamt++;
    const istSatzanf = pruefesSatzanfang(tokens, i);
    const suchSchluessel = token.toLowerCase();

    // ── Schicht 0: Wort-Regeln (Pronomen, Partikel, Korrekturen) ──
    // Diese haben Vorrang vor dem Wörterbuch, da das Wb. teils
    // falsche oder mehrdeutige Einträge für Funktionswörter hat.
    const wortRegel = PHONOLOGISCHE_REGELN.find(
      r => r.typ === "wort" && r.status === "ok"
        && new RegExp(`^${r.von.source.replace(/\\b/g, '')}$`, "i").test(token)
    );
    if (wortRegel) {
      const koelsch = token.replace(wortRegel.von, wortRegel.zu);
      ergebnisse.push(passeSchreibungAn(koelsch, token, istSatzanf));
      statistik.woerterb++;
      continue;
    }

    // ── Schicht 0.5: Hilfsverb-Konjugation ──
    // Erst 2-Wort-Kontext prüfen ("ich habe" → "han"), dann Einzelwort ("habe" → "han")
    // Löst das Problem dass Konjugationsformen in den Rohdaten nur bei der Grundform
    // stehen, aber als eigenständige Wörter im Text auftreten.
    let hilfsverbTreffer = null;
    const vorherigWort = (function() {
      for (let j = i - 1; j >= 0; j--) {
        if (/[a-zA-ZäöüÄÖÜß]/.test(tokens[j])) return tokens[j].toLowerCase();
        if (tokens[j].trim() !== "") break;
      }
      return null;
    })();

    if (vorherigWort) {
      const zweiWort = vorherigWort + " " + suchSchluessel;
      if (HILFSVERB_KONJUGATION[zweiWort]) {
        hilfsverbTreffer = HILFSVERB_KONJUGATION[zweiWort].split(" ").pop();
      }
    }
    if (!hilfsverbTreffer && HILFSVERB_KONJUGATION[suchSchluessel]) {
      hilfsverbTreffer = HILFSVERB_KONJUGATION[suchSchluessel];
    }
    if (hilfsverbTreffer) {
      ergebnisse.push(passeSchreibungAn(hilfsverbTreffer, token, istSatzanf));
      statistik.woerterb++;
      continue;
    }

    // ── Schicht 0.7: Allgemeine Verbkonjugation ──
    // Konjugierte Formen (ich/du/er-Formen) die nicht im Wörterbuch stehen,
    // weil die Kölsch-Akademie sie nur im Paradigma der Grundform speichert.
    if (VERB_KONJUGATION[suchSchluessel]) {
      ergebnisse.push(passeSchreibungAn(VERB_KONJUGATION[suchSchluessel], token, istSatzanf));
      statistik.woerterb++;
      continue;
    }

    // ── Schicht 1: Wörterbuch-Lookup ──
    if (typeof KOELSCH_WOERTERBUCH !== "undefined"
        && KOELSCH_WOERTERBUCH[suchSchluessel]) {

      const auswahl = waehleVariante(KOELSCH_WOERTERBUCH[suchSchluessel]);
      if (auswahl.weitere.length > 0) {
        varianten.push({
          wort:     token,
          gewaehlt: auswahl.gewaehlt,
          weitere:  auswahl.weitere
        });
      }
      ergebnisse.push(passeSchreibungAn(auswahl.gewaehlt, token, istSatzanf));
      statistik.woerterb++;
      continue;
    }

    // ── Schicht 2: Phonologische Regeln ──
    const regelSpur = [];
    const regelGefeuert = [];
    const regelErgebnis = wendeRegelnAn(token, regelSpur, regelGefeuert);

    // Auslösekriterium: taugt die Regelausgabe als Übersetzung?
    const eignung = regelergebnisTauglich(regelErgebnis, regelGefeuert);
    if (eignung.tauglich) {
      ergebnisse.push(passeSchreibungAn(regelErgebnis, token, istSatzanf));
      regelTreffer.push({ wort: token, form: regelErgebnis, regeln: regelSpur });
      statistik.regeln++;
      continue;
    }

    // ── Schicht 3: Modul 3 übernimmt – markieren ──
    ergebnisse.push(`[?${token}?]`);
    unbekannte.push(token);
    if (regelGefeuert.length > 0) {
      regelAbgewiesen.push({ wort: token, form: regelErgebnis, grund: eignung.grund });
    }
    statistik.unbekannt++;
  }

  return {
    uebersetzung:      ergebnisse.join(""),
    statistik:         statistik,
    unbekannteWoerter: [...new Set(unbekannte)], // Dedupliziert
    varianten:         varianten,
    regelTreffer:      regelTreffer,
    regelAbgewiesen:   regelAbgewiesen
  };
}


// ─────────────────────────────────────────────────────────────
//  EXPORT (für Node.js-Tests und Browser)
// ─────────────────────────────────────────────────────────────

if (typeof module !== "undefined" && module.exports) {
  // Node.js
  module.exports = { uebersetze, wendeRegelnAn, waehleVariante, regelergebnisTauglich, PHONOLOGISCHE_REGELN };
} else {
  // Browser: global verfügbar
  window.KoelschTranslator = { uebersetze, wendeRegelnAn, waehleVariante, regelergebnisTauglich, PHONOLOGISCHE_REGELN };
}
