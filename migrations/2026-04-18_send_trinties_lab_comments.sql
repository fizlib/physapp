-- Generated from uploaded student_messages_rows.sql
-- Keeps the exact message body from rezultatai.md while omitting the markdown section headings.
-- Anonymous/unmapped sections are not included because they do not have a concrete student profile.

WITH message_data (student_id, content) AS (
VALUES
    ('75f802f4-8607-4e23-bbeb-d44e06d3b457'::uuid, $msg1$1. **Pavadinimas (0,5 tšk.):** Parašytas tiksliai.
2. **Tikslas (0,5 tšk.):** Parašytas, bet suformuluotas netiksliai (surašyti tiesiog ieškomi dydžiai).
3. **Hipotezė (1 tšk.):** Suformuluota logiškai ir tikrintinai („Jei... tai...“).
4. **Priemonės (0 tšk.):** Neišvardintos.
5. **Teorija ir formulės (0 tšk.):** Teorijos ir formulių nėra.
6. **Matavimai (3 tšk.):** Lentelė tvarkinga, visi 3 bandymai x 3 žingsniai atlikti, matavimo vienetai yra.
7. **Skaičiavimai (2 tšk.):** Dauguma suskaičiuota, bet $\mu$ dydžiui priskirtas neteisingas matavimo vienetas „$\mu$“, pirmajame žingsnyje neįrašytas bendras svoris. 
8. **Rezultatų užrašymas (0 tšk.):** Rezultatai atskirai neužrašyti.
9. **Išvada (1 tšk.):** Tik 1 elementas – patvirtinta hipotezė.
10. **Refleksija (1 tšk.):** Refleksija parašyta.

**Bendra suma:** 9/17 tšk.

**Galutinis pažymys:** 5

**Patarimas:** Kornelijau, kitą kartą nepamiršk aprašyti darbo priemonių ir teorijos (formulių). Taip pat atkreipk dėmesį, kad trinties koeficientas $\mu$ neturi matavimo vieneto. Išvadą formuok išsamiau.$msg1$),
    ('f62fa077-a43e-4770-aaf0-5b404e4d32a7'::uuid, $msg2$1. **Pavadinimas (0,5 tšk.):** Parašytas tiksliai.
2. **Tikslas (1 tšk.):** Suformuluotas labai tiksliai.
3. **Hipotezė (0 tšk.):** „Jei teisingai apskaičiuosime...“ – tai nėra mokslinė hipotezė, spėjanti fizikinio dydžio ryšį.
4. **Priemonės (0,5 tšk.):** Visi 4 prietaisai išvardinti.
5. **Teorija ir formulės (0 tšk.):** Nėra.
6. **Matavimai (3 tšk.):** Lentelėje įrašyti tiesioginiai matavimai (su vienetais).
7. **Skaičiavimai (1 tšk.):** Lentelė nepilna, trūksta 2 ir 3 žingsnio koeficientų apskaičiavimo.
8. **Rezultatų užrašymas (0 tšk.):** Nėra.
9. **Išvada (0 tšk.):** Išvados visiškai nėra.
10. **Refleksija (0 tšk.):** Nėra.

**Bendra suma:** 6/17 tšk.

**Galutinis pažymys:** 4

**Patarimas:** Deimantai, darbas nebaigtas. Būtina pabaigti skaičiavimus lentelėje, parašyti teoriją bei suformuluoti darbo išvadą.$msg2$),
    ('d07ca9a9-54a6-4bab-ab25-5e88ec62b5f9'::uuid, $msg3$1. **Pavadinimas (0 tšk.):** Yra tik „Laboratorinis darbas“, trūksta tikslaus pavadinimo.
2. **Tikslas (1 tšk.):** Suformuluotas tiksliai.
3. **Hipotezė (1 tšk.):** Logiška ir puikiai suformuluota.
4. **Priemonės (0,5 tšk.):** Išvardintos visos.
5. **Teorija ir formulės (0 tšk.):** Nėra.
6. **Matavimai (3 tšk.):** Lentelėje įrašyti visi $F_{tr}$ matavimai.
7. **Skaičiavimai (1 tšk.):** Neapskaičiuota svarbiausia dalis – trinties koeficientas $\mu$.
8. **Rezultatų užrašymas (0 tšk.):** Nėra.
9. **Išvada (1 tšk.):** Įvertinta hipotezė, bet neatsakyta į tikslą ir neaptartos paklaidos (2 elementai).
10. **Refleksija (0 tšk.):** Nėra.

**Bendra suma:** 7,5/17 tšk.

**Galutinis pažymys:** 4

**Patarimas:** Pauliau, laboratoriniame darbe svarbiausia atlikti galutinius skaičiavimus (rasti $\mu$) ir nurodyti teorines formules. Neužmiršk refleksijos.$msg3$),
    ('34365458-9240-44be-a752-8367cc5738ed'::uuid, $msg4$1. **Pavadinimas (0 tšk.):** Tikslaus pavadinimo nėra.
2. **Tikslas (1 tšk.):** Tikslus.
3. **Hipotezė (0 tšk.):** Nėra.
4. **Priemonės (0,5 tšk.):** Išvardintos visos.
5. **Teorija ir formulės (3 tšk.):** Išsamiai aprašyta teorija, pateiktos visos trys reikiamos formulės.
6. **Matavimai (3 tšk.):** Lentelė pilna, matavimai atlikti.
7. **Skaičiavimai (2 tšk.):** Skaičiavimai surašyti, bet paklaidų procentai labai nerealistiški (138 %, 89 %), matosi skaičiavimo klaidų.
8. **Rezultatų užrašymas (1 tšk.):** Aiškiai užrašyti rezultatai po teorija.
9. **Išvada (0 tšk.):** Nėra.
10. **Refleksija (0 tšk.):** Nėra.

**Bendra suma:** 10,5/17 tšk.

**Galutinis pažymys:** 6

**Patarimas:** Matai, tavo teorinė dalis gerai parašyta, tačiau labai trūksta darbo išvados, hipotezės ir refleksijos. Atkreipk dėmesį į paklaidų skaičiavimą.$msg4$),
    ('0e3ff814-2849-46b3-8be2-9c934f18f3d9'::uuid, $msg5$1. **Pavadinimas (0,5 tšk.):** Yra tikslus.
2. **Tikslas (1 tšk.):** Tikslus.
3. **Hipotezė (1 tšk.):** Logiška ir aiški.
4. **Priemonės (0,5 tšk.):** Yra visos.
5. **Teorija ir formulės (0 tšk.):** Parašyta tik „Teorija: trint...“ ir nutrūksta. Formulių nėra.
6. **Matavimai (3 tšk.):** Lentelė pilna ir aiški.
7. **Skaičiavimai (3 tšk.):** Atlikti visi skaičiavimai, aiškiai parodyta sprendimo eiga pačioje lentelėje.
8. **Rezultatų užrašymas (1 tšk.):** Išrašyta atskirai.
9. **Išvada (3 tšk.):** Ideali išvada – atsakyta į tikslą, patvirtinta hipotezė ir įvertintos paklaidų priežastys (3 elementai).
10. **Refleksija (0 tšk.):** Nors išvada puiki, atskiros asmeninės refleksijos (apie sunkumus, mokymąsi) nėra.

**Bendra suma:** 13/17 tšk.

**Galutinis pažymys:** 8

**Patarimas:** Elze, puikus ir tvarkingas darbas. Kitą kartą būtinai pabaik rašyti teorijos dalį ir užrašyk trumpą refleksiją apie savo asmeninę patirtį darant darbą.$msg5$),
    ('336e8a4e-0a84-493b-b296-3acfd4452618'::uuid, $msg6$1. **Pavadinimas (0,5 tšk.):** Tikslus.
2. **Tikslas (1 tšk.):** Tikslus.
3. **Hipotezė (1 tšk.):** Puikiai suformuluota.
4. **Priemonės (0,5 tšk.):** Išvardintos visos.
5. **Teorija ir formulės (3 tšk.):** Surašytos visos 3 reikiamos formulės ir paaiškinimai.
6. **Matavimai (3 tšk.):** Lentelė užpildyta.
7. **Skaičiavimai (1 tšk.):** Trūksta svarbiausio skaičiavimo – nei viename žingsnyje nesuskaičiuotas ir neįrašytas trinties koeficientas $\mu$.
8. **Rezultatų užrašymas (0 tšk.):** Nėra.
9. **Išvada (1 tšk.):** Labai trumpa („Hipotezė pasitvirtino“ – tik 1 elementas).
10. **Refleksija (1 tšk.):** Parašyta.

**Bendra suma:** 12/17 tšk.

**Galutinis pažymys:** 7

**Patarimas:** Dominyka, darbo pradžia labai gera, bet lentelėje trūksta pagrindinio darbo tikslo – $\mu$ apskaičiavimo. Išvadą rašyk išsamesnę, apimančią ir darbo tikslą, ir paklaidas.$msg6$),
    ('a045ac45-ac49-40d2-abc0-3ccb3accff4f'::uuid, $msg7$1. **Pavadinimas (0 tšk.):** Tikslaus pavadinimo nėra.
2. **Tikslas (1 tšk.):** Tikslus.
3. **Hipotezė (1 tšk.):** Logiška.
4. **Priemonės (0,5 tšk.):** Visos 4 yra.
5. **Teorija ir formulės (0 tšk.):** Matosi skaičiavimai apačioje, bet teorinių bendrųjų formulių ($F_{tr}=\mu N$ ir kt.) neparašyta.
6. **Matavimai (3 tšk.):** Lentelė visiškai užpildyta.
7. **Skaičiavimai (2 tšk.):** Skaičiuota gana tvarkingai, tačiau yra grubi matematinė klaida 3 žingsnio vidurkyje ($2,4; 2,5; 2,3$ vidurkis niekaip negali būti $4,2$). Prie $\mu$ prirašytas klaidingas vienetas $\mu$.
8. **Rezultatų užrašymas (1 tšk.):** Rezultatai surašyti atskirai po lentele.
9. **Išvada (0 tšk.):** Palikta tuščia vieta.
10. **Refleksija (1 tšk.):** Yra.

**Bendra suma:** 9,5/17 tšk.

**Galutinis pažymys:** 6

**Patarimas:** Mėta, atidžiau skaičiuok vidurkius. Trinties koeficientas neturi matavimo vieneto. Būtinai formuluok išvadas.$msg7$),
    ('c22ca978-0c5a-4523-ad59-8b3ccb9e869a'::uuid, $msg8$1. **Pavadinimas (0 tšk.):** Nėra tikslaus.
2. **Tikslas (1 tšk.):** Tikslus.
3. **Hipotezė (1 tšk.):** Logiška.
4. **Priemonės (0,5 tšk.):** Yra visos 4.
5. **Teorija ir formulės (2 tšk.):** Teorija pradėta, yra dvi formulės iš trijų (trūksta išreikšto $\mu = F_{tr}/P$).
6. **Matavimai (3 tšk.):** Tvarkingai užpildyta.
7. **Skaičiavimai (3 tšk.):** Lentelėje rezultatai suskaičiuoti puikiai.
8. **Rezultatų užrašymas (0 tšk.):** Nėra atskirai.
9. **Išvada (0 tšk.):** Nėra.
10. **Refleksija (0 tšk.):** Nėra.

**Bendra suma:** 10,5/17 tšk.

**Galutinis pažymys:** 6

**Patarimas:** Juliau, tavo skaičiavimai ir matavimai puikūs, bet darbui trūksta esminio užbaigimo – išvados ir refleksijos.$msg8$),
    ('b04877d9-2c1a-494d-874f-27a5cd0fa682'::uuid, $msg9$*(Darbas identiškas J. Bartoševičiaus darbui PDF 9)*
1. **Pavadinimas (0 tšk.):** Nėra tikslaus.
2. **Tikslas (1 tšk.):** Tikslus.
3. **Hipotezė (1 tšk.):** Logiška.
4. **Priemonės (0,5 tšk.):** Yra visos 4.
5. **Teorija ir formulės (2 tšk.):** Yra 2 iš 3 reikalaujamų formulių.
6. **Matavimai (3 tšk.):** Tvarkingai užpildyta.
7. **Skaičiavimai (3 tšk.):** Skaičiavimai atlikti teisingai.
8. **Rezultatų užrašymas (0 tšk.):** Nėra.
9. **Išvada (0 tšk.):** Nėra.
10. **Refleksija (0 tšk.):** Nėra.

**Bendra suma:** 10,5/17 tšk.

**Galutinis pažymys:** 6

**Patarimas:** Deividai, labai gaila, kad laboratorinio darbo neužbaigei. Be išvados darbas netenka mokslinės prasmės. Nepamiršk refleksijos.$msg9$),
    ('8258be98-e138-4dc4-a4ef-bfef22bb10d2'::uuid, $msg10$1. **Pavadinimas (0 tšk.):** Nėra tikslaus.
2. **Tikslas (1 tšk.):** Tikslus.
3. **Hipotezė (1 tšk.):** Logiška.
4. **Priemonės (0,5 tšk.):** Yra visos.
5. **Teorija ir formulės (0 tšk.):** Bendrųjų formulių nėra.
6. **Matavimai (3 tšk.):** Įrašyti 3x3 bandymai.
7. **Skaičiavimai (2 tšk.):** Yra klaidų lentelėje (pvz., paskutinio žingsnio vidurkis įrašytas 4,2 N, kas rodo neatidumą).
8. **Rezultatų užrašymas (1 tšk.):** Užrašyti žemiau po eigos punktais.
9. **Išvada (0 tšk.):** Palikta tuščia vieta.
10. **Refleksija (1 tšk.):** Yra.

**Bendra suma:** 9,5/17 tšk.

**Galutinis pažymys:** 6

**Patarimas:** Ariana, atidžiau vertink skaičiavimo rezultatus (ar logiška, kad vidurkis didesnis už matuotas vertes?). Privaloma rašyti išvadą.$msg10$),
    ('7a167ef5-ccd8-4267-8807-15ad549ab88a'::uuid, $msg11$1. **Pavadinimas (0 tšk.):** Nėra tikslaus pavadinimo.
2. **Tikslas (1 tšk.):** Tikslus.
3. **Hipotezė (1 tšk.):** Logiška.
4. **Priemonės (0,5 tšk.):** Visos išvardintos (nors parašyta tiesiog „pasvarai“).
5. **Teorija ir formulės (3 tšk.):** Teorija puiki, yra visos 3 formulės.
6. **Matavimai (2 tšk.):** Lentelėje išvis trūksta Ftr stulpelio antraštės. Nors rezultatai surašyti, lentelės struktūra netiksli.
7. **Skaičiavimai (3 tšk.):** Viskas suskaičiuota teisingai.
8. **Rezultatų užrašymas (0 tšk.):** Atskirai nesurašyta.
9. **Išvada (2 tšk.):** Atsakyta į tikslą ir hipotezę, bet neaptartos paklaidos (2 elementai).
10. **Refleksija (1 tšk.):** Yra.

**Bendra suma:** 13,5/17 tšk.

**Galutinis pažymys:** 8

**Patarimas:** Samanta, atidžiai braižyk lenteles, kad nepasimestų stulpelių pavadinimai ($F_{tr}$). Išvadoje reikėtų paminėti, kodėl atsirado paklaidų.$msg11$),
    ('984df024-d68c-4f00-932e-b0e2aceebe74'::uuid, $msg12$*(Kitos porininkės darbas)*
1. **Pavadinimas (0 tšk.):** Nėra tikslaus.
2. **Tikslas (1 tšk.):** Tikslus.
3. **Hipotezė (1 tšk.):** Logiška.
4. **Priemonės (0,5 tšk.):** Yra visos 4.
5. **Teorija ir formulės (3 tšk.):** Yra visos 3 formulės.
6. **Matavimai (3 tšk.):** Čia lentelės antraštės jau tvarkingos, visi bandymai atlikti.
7. **Skaičiavimai (3 tšk.):** Atlikti ir įrašyti tvarkingai.
8. **Rezultatų užrašymas (0 tšk.):** Atskirai nesurašyta.
9. **Išvada (2 tšk.):** Atsakyta į tikslą ir hipotezę, be paklaidų vertinimo.
10. **Refleksija (1 tšk.):** Yra.

**Bendra suma:** 14,5/17 tšk.

**Galutinis pažymys:** 9

**Patarimas:** Evelina, puikus, išsamus darbas. Norint gauti maksimalų įvertinimą, trūko tik tikslaus pradinio pavadinimo ir paklaidų apmąstymo išvadoje.$msg12$),
    ('026e13fa-45b4-4b45-9923-4d785b2ceb8d'::uuid, $msg13$1. **Pavadinimas (0,5 tšk.):** Labai artimas (skaičiavimas vietoj apskaičiavimas) – užskaityta.
2. **Tikslas (0 tšk.):** Visiškai nėra.
3. **Hipotezė (0 tšk.):** Yra tik žodis, bet neparašyta pati hipotezė.
4. **Priemonės (0,5 tšk.):** Yra visos 4.
5. **Teorija ir formulės (1 tšk.):** Tarp skaičiavimų paminėta $\mu = F_{tr}/P$, tačiau bendros teorijos ir kitų formulių trūksta.
6. **Matavimai (3 tšk.):** Lentelė pilna.
7. **Skaičiavimai (2 tšk.):** Skaičiavimai atlikti, tačiau prie trinties koeficiento $\mu$ prirašytas neteisingas matavimo vienetas „$\mu$“ (pvz., 0,33 $\mu$).
8. **Rezultatų užrašymas (1 tšk.):** Rezultato vidurkis užrašytas žemiau.
9. **Išvada (1 tšk.):** Tik vienas elementas.
10. **Refleksija (0 tšk.):** Nėra.

**Bendra suma:** 9/17 tšk.

**Galutinis pažymys:** 5

**Patarimas:** Dominykai, darbui trūksta bazinių dalių: tikslo, hipotezės teksto, refleksijos. Taip pat įsidėmėk, kad trinties koeficientas neturi matavimo vieneto.$msg13$),
    ('56355022-e889-481c-908d-3a88298141f1'::uuid, $msg14$1. **Pavadinimas (0,5 tšk.):** Yra tikslus.
2. **Tikslas (1 tšk.):** Tikslus.
3. **Hipotezė (1 tšk.):** Logiška ir aiški.
4. **Priemonės (0,5 tšk.):** Yra visos 4.
5. **Teorija ir formulės (3 tšk.):** Yra visos reikalingos formulės (papildomos gravitacijos formulės čia nereikėjo, bet baudos už tai nėra).
6. **Matavimai (3 tšk.):** Visi trys žingsniai atlikti tvarkingai.
7. **Skaičiavimai (3 tšk.):** Lentelė puikiai užpildyta.
8. **Rezultatų užrašymas (0 tšk.):** Atskirai nesurašyta.
9. **Išvada (1 tšk.):** Nurodyta tik, kad hipotezė nepasitvirtino, nėra atsakyta į darbo tikslą ar apmąstytos paklaidos.
10. **Refleksija (1 tšk.):** Yra (pakankamai savikritiška).

**Bendra suma:** 14/17 tšk.

**Galutinis pažymys:** 8

**Patarimas:** Ąžuolai, laboratorinis darbas atliktas tvarkingai. Tačiau išvada negali apsiriboti vienu sakiniu apie hipotezę – joje dar reikia atsakyti į darbo tikslą ir aptarti paklaidų priežastis.$msg14$),
    ('39e0aedd-7b53-4d82-8e6c-a391267146dd'::uuid, $msg15$1. **Pavadinimas (0 tšk.):** Nėra tikslaus pavadinimo.
2. **Tikslas (0 tšk.):** Nėra.
3. **Hipotezė (1 tšk.):** Suformuluota logiškai.
4. **Priemonės (0 tšk.):** Neišvardintos.
5. **Teorija ir formulės (3 tšk.):** Teorija parašyta puikiai, visos 3 formulės yra.
6. **Matavimai (3 tšk.):** Visi žingsniai atlikti.
7. **Skaičiavimai (3 tšk.):** Skaičiavimai surašyti tvarkingai.
8. **Rezultatų užrašymas (0 tšk.):** Nėra.
9. **Išvada (0 tšk.):** Visiškai nėra išvados.
10. **Refleksija (0 tšk.):** Nėra.

**Bendra suma:** 10/17 tšk.

**Galutinis pažymys:** 6

**Patarimas:** Mykolai, praleidai daug svarbių darbo apiforminimo dalių: tikslą, priemones, išvadą ir refleksiją. Be jų net ir teisingai apskaičiuotas darbas atrodo neužbaigtas.$msg15$),
    ('4c548ae0-5053-4225-ac7b-c663332bc06c'::uuid, $msg16$1. **Pavadinimas (0 tšk.):** Nėra tikslaus.
2. **Tikslas (0 tšk.):** Nėra.
3. **Hipotezė (1 tšk.):** Yra logiška hipotezė.
4. **Priemonės (0,5 tšk.):** Išvardintos visos.
5. **Teorija ir formulės (2 tšk.):** Yra 2 formulės, trūksta galutinės $\mu=F/P$.
6. **Matavimai (3 tšk.):** Lentelė pilna.
7. **Skaičiavimai (3 tšk.):** Atlikti ir surašyti teisingai.
8. **Rezultatų užrašymas (0 tšk.):** Nėra.
9. **Išvada (1 tšk.):** Tik 1 elementas (dėl hipotezės).
10. **Refleksija (1 tšk.):** Yra, nuoširdi.

**Bendra suma:** 11,5/17 tšk.

**Galutinis pažymys:** 7

**Patarimas:** Simonai, atkreipk dėmesį į pasiruošimą kitą kartą – rašyk darbo tikslą ir išsamią išvadą, apimančią ir darbo rezultatus, o ne tik hipotezės patikrinimą.$msg16$),
    ('2e9e601d-9d0c-40a2-8bb6-2f4303b4a7b5'::uuid, $msg17$1. **Pavadinimas (0,5 tšk.):** Tikslus.
2. **Tikslas (0 tšk.):** Nėra.
3. **Hipotezė (1 tšk.):** Logiška.
4. **Priemonės (0 tšk.):** Nėra.
5. **Teorija ir formulės (0 tšk.):** Nėra.
6. **Matavimai (3 tšk.):** Lentelė pilna.
7. **Skaičiavimai (2 tšk.):** Lentelėje yra skaičiavimai, tačiau prirašytas neteisingas matavimo vienetas „$\mu$“.
8. **Rezultatų užrašymas (1 tšk.):** Koeficientų vidurkis parašytas išvadoje.
9. **Išvada (1 tšk.):** 1 elementas (atsakas į hipotezę / apibendrinimas).
10. **Refleksija (0 tšk.):** Nėra.

**Bendra suma:** 8,5/17 tšk.

**Galutinis pažymys:** 5

**Patarimas:** Laurynai, darbo aprašymas per daug skurdus. Visuomet būtina aprašyti tikslą, priemones bei nurodyti teorines formules. Koeficientas vienetų neturi.$msg17$),
    ('6b09c37c-8c01-45c6-9e18-a4b8b559c89c'::uuid, $msg18$1. **Pavadinimas (0 tšk.):** Tikslaus nėra.
2. **Tikslas (0 tšk.):** Nėra.
3. **Hipotezė (1 tšk.):** Logiška.
4. **Priemonės (0,5 tšk.):** Visos išvardintos.
5. **Teorija ir formulės (0 tšk.):** Nėra.
6. **Matavimai (3 tšk.):** 3 žingsniai po 3 matavimus yra įrašyti.
7. **Skaičiavimai (1 tšk.):** Lentelė praktiškai tuščia dešinėje pusėje: visiškai neapskaičiuoti bendri svoriai ir patys trinties koeficientai $\mu$.
8. **Rezultatų užrašymas (0 tšk.):** Nėra.
9. **Išvada (0 tšk.):** Nėra išvados.
10. **Refleksija (1 tšk.):** Yra parašyta.

**Bendra suma:** 6,5/17 tšk.

**Galutinis pažymys:** 4

**Patarimas:** Areta, fizikos laboratoriniame darbe neužtenka tik išmatuoti jėgą – pagrindinė užduotis buvo iš tų duomenų suskaičiuoti koeficientą $\mu$.$msg18$),
    ('e6664c8d-b424-4bec-a423-4fa8d98b78a4'::uuid, $msg19$1. **Pavadinimas (0,5 tšk.):** Yra tikslus.
2. **Tikslas (0 tšk.):** Nėra.
3. **Hipotezė (1 tšk.):** Logiška.
4. **Priemonės (0,5 tšk.):** Visos.
5. **Teorija ir formulės (0 tšk.):** Nėra.
6. **Matavimai (3 tšk.):** Įrašyti.
7. **Skaičiavimai (1 tšk.):** Kaip ir Aretos darbe, nesuskaičiuoti patys svarbiausi dydžiai – svoris ir trinties koeficientas.
8. **Rezultatų užrašymas (0 tšk.):** Nėra.
9. **Išvada (0 tšk.):** Nėra.
10. **Refleksija (1 tšk.):** Yra parašyta.

**Bendra suma:** 7/17 tšk.

**Galutinis pažymys:** 4

**Patarimas:** Vasare, nepabaigei darbo svarbiausios dalies – koeficiento apskaičiavimo. Todėl ir darbo išvados suformuluoti neįmanoma. Kitą kartą atlik visas užduotis iki galo.$msg19$),
    ('a5da39e4-dbdd-40de-b41f-25a9da0592e7'::uuid, $msg20$1. **Pavadinimas (0,5 tšk.):** Yra.
2. **Tikslas (1 tšk.):** Yra..
3. **Hipotezė (0 tšk.):** Teksto nėra (nors išvadoje rašoma, kad ji „patvirtinta“).
4. **Priemonės (0,5 tšk.):** Yra.
5. **Teorija ir formulės (3 tšk.):** Bendros teorijos nėra.
6. **Matavimai (3 tšk.):** Lentelė pilna.
7. **Skaičiavimai (3 tšk.):** Išsamiai parodyti skaičiavimai pačioje lentelėje, atsakymai teisingi.
8. **Rezultatų užrašymas (1 tšk.):** Koeficientai išrašyti po lentele.
9. **Išvada (2 tšk.):** Atsakyta į tikslą („apskaičiavome...“) ir paminėta hipotezė, bet nevertintos paklaidos.
10. **Refleksija (0 tšk.):** Nėra refleksijos skiltelės.

**Bendra suma:** 14/17 tšk.

**Galutinis pažymys:** 8

**Patarimas:** Kamile, tavo matematinė dalis puiki, tačiau reikėtų nepamiršti parašyti refleksijos ir pilnos išvados.$msg20$),
    ('867692fa-c03a-4e04-9156-f50399a01308'::uuid, $msg21$1. **Pavadinimas (0,5 tšk.):** Tikslus.
2. **Tikslas (1 tšk.):** Tikslus.
3. **Hipotezė (1 tšk.):** Logiška (nors ir fiziškai klaidinga, bet tai tinkama hipotezė patikrinimui).
4. **Priemonės (0,5 tšk.):** Visos išvardintos.
5. **Teorija ir formulės (3 tšk.):** Suradytos visos reikiamos formulės.
6. **Matavimai (3 tšk.):** Lentelėje viskas suvesta.
7. **Skaičiavimai (2 tšk.):** Lentelė pilna, bet yra akivaizdžių skaičiavimo klaidų (pvz., $\mu = 0,4/2$ turi būti $0,2$, o įrašyta $0,025$).
8. **Rezultatų užrašymas (0 tšk.):** Nėra atskirai.
9. **Išvada (2 tšk.):** Atsakyta į tikslą ir apibendrinta hipotezė (paklaidos neaptartos).
10. **Refleksija (1 tšk.):** Puiki, išsami refleksija.

**Bendra suma:** 14/17 tšk.

**Galutinis pažymys:** 8

**Patarimas:** Vilte, tavo darbas apiformintas tiesiog puikiai. Tačiau būk labai atidi skaičiuodama su skaičiuotuvu – praleidai kablelio vietas, dėl ko koeficientai gavosi labai maži.$msg21$),
    ('85dd93b4-6156-46ed-8c4e-65858c56f20a'::uuid, $msg22$*(Darbas labai panašus į V. Marcinonytės)*
1. **Pavadinimas (0,5 tšk.):** Beveik tikslus, užskaityta.
2. **Tikslas (1 tšk.):** Tikslus.
3. **Hipotezė (1 tšk.):** Logiška.
4. **Priemonės (0,5 tšk.):** Išvardintos.
5. **Teorija ir formulės (3 tšk.):** Visos 3 formulės vietoje.
6. **Matavimai (3 tšk.):** Lentelė pilna.
7. **Skaičiavimai (2 tšk.):** Ta pati skaičiavimo kablelio klaida dalinant, kaip ir porininkės darbe.
8. **Rezultatų užrašymas (0 tšk.):** Atskirai nėra.
9. **Išvada (2 tšk.):** Yra 2 iš 3 elementų (tikslas, hipotezė).
10. **Refleksija (1 tšk.):** Puiki.

**Bendra suma:** 14/17 tšk.

**Galutinis pažymys:** 8

**Patarimas:** Rugile, puikus teorinis ir struktūrinis apiforminimas. Atidžiau atlik dalybos veiksmus skaičiuodama trinties koeficientą.$msg22$),
    ('bae598c7-63c1-41f9-bfca-1557c802dd4d'::uuid, $msg23$1. **Pavadinimas (0 tšk.):** Nėra tikslaus pavadinimo.
2. **Tikslas (0 tšk.):** Palikta tuščia vieta.
3. **Hipotezė (1 tšk.):** Suformuluota logiška hipotezė.
4. **Priemonės (0 tšk.):** Neišvardintos.
5. **Teorija ir formulės (0 tšk.):** Nėra.
6. **Matavimai (3 tšk.):** Tiesioginiai matavimai atlikti 3 žingsniams.
7. **Skaičiavimai (1 tšk.):** Pagrindinis lentelės stulpelis (Slydimo trinties koeficientas) liko visiškai tuščias.
8. **Rezultatų užrašymas (0 tšk.):** Nėra.
9. **Išvada (2 tšk.):** Yra išvada apie jėgos kitimą ir koeficiento pastovumą (tačiau paties koeficiento lentelėje neapskaičiavai.).
10. **Refleksija (0 tšk.):** Nėra.

**Bendra suma:** 7/17 tšk.

**Galutinis pažymys:** 4

**Patarimas:** Lukai, darbas atrodo neužbaigtas. Išvadoje teigi, kad koeficientas išlieka pastovus, bet lentelėje jo net neskaičiavai. Kitą kartą atlik visas skaičiavimo užduotis.$msg23$),
    ('b077643b-bfe2-45da-9017-e22d83adc646'::uuid, $msg24$1. **Pavadinimas (0,5 tšk.):** Tikslus.
2. **Tikslas (1 tšk.):** Tiksliai suformuluotas.
3. **Hipotezė (0,5 tšk.):** „Jei teisingai viską išmatuosime...“ – tai nėra tikra mokslinė hipotezė. Hipotezė turi spėti fizikinių dydžių priklausomybę.
4. **Priemonės (0,5 tšk.):** Išvardintos visos.
5. **Teorija ir formulės (3 tšk.):** Puikiai, visos formulės yra.
6. **Matavimai (3 tšk.):** Lentelė pilna.
7. **Skaičiavimai (3 tšk.):** Visi skaičiavimai idealūs, aiškiai išrašyti net su visu sprendimo keliu apačioje.
8. **Rezultatų užrašymas (1 tšk.):** Aišku ir nuoseklu.
9. **Išvada (0 tšk.):** Gaila, bet išvados nėra jokios.
10. **Refleksija (0 tšk.):** Nėra refleksijos.

**Bendra suma:** 12,5/17 tšk.

**Galutinis pažymys:** 7

**Patarimas:** Eivydai, tavo skaičiavimų ir teorijos dalis verta 10 balų. Tačiau labai gaila, kad numetei darbą nepabaigęs parašyti galutinės išvados ir refleksijos.$msg24$),
    ('7ed1d6e0-e97e-4303-b839-fd47ab64b0df'::uuid, $msg25$1. **Pavadinimas (0,5 tšk.):** Tikslus.
2. **Tikslas (1 tšk.):** Tikslus.
3. **Hipotezė (0,5 tšk.):** Hipotezė nesuformuluoja mokslinio spėjimo („Jei padarysim tašelį... tai apskaičiuosim“).
4. **Priemonės (0,5 tšk.):** Išvardintos visos.
5. **Teorija ir formulės (3 tšk.):** Yra visos reikalingos.
6. **Matavimai (3 tšk.):** Matavimai atlikti, lentelė tvarkinga.
7. **Skaičiavimai (3 tšk.):** Skaičiavimai atlikti teisingai.
8. **Rezultatų užrašymas (1 tšk.):** Aišku, išskirta punktais.
9. **Išvada (2 tšk.):** Yra 2 elementai (atsakas į tikslą ir paklaidų įvertinimas).
10. **Refleksija (1 tšk.):** Išsami refleksija atsakius į tris atskirus punktus. Puiku.

**Bendra suma:** 15,5/17 tšk.

**Galutinis pažymys:** 9

**Patarimas:** Simonai, hipotezę reikia formuluoti apie tai, ko tikiesi iš rezultatų (pvz., „ar koeficientas keisis, jei keisis svoris?“).$msg25$),
    ('e5043ee3-b230-4eee-9037-c7e35e966157'::uuid, $msg26$1. **Pavadinimas (0 tšk.):** Yra tik „Laboratorinis darbas“.
2. **Tikslas (1 tšk.):** Tikslus.
3. **Hipotezė (1 tšk.):** Logiška.
4. **Priemonės (0,5 tšk.):** Išvardintos visos.
5. **Teorija ir formulės (0 tšk.):** Teorijos nerapašyta.
6. **Matavimai (3 tšk.):** Lentelė pilna.
7. **Skaičiavimai (2 tšk.):** Atlikti visi skaičiavimai, tačiau paklaidos (138 %, 89 % ir t. t.) suskaičiuotos naudojant neteisingą metodiką/matematiką.
8. **Rezultatų užrašymas (1 tšk.):** Išrašyti atskirai rezultatų skiltyje.
9. **Išvada (1 tšk.):** Išvadoje aprašytas tik hipotezės patvirtinimo/paneigimo elementas. Pati išvada neatitinka gautų matavimo rezultatų, kadangi išmatavai jog slydimo trinties koeficientas keičiant tašelio svorį išlieka pastovus.
10. **Refleksija (1 tšk.):** Trumpai, bet aprašyta.

**Bendra suma:** 10,5/17 tšk.

**Galutinis pažymys:** 6

**Patarimas:** Vytautai, būtina darbe parašyti formules, kuriomis remiantis skaičiuoji. Atidžiau nagrinėk paklaidų skaičiavimo taisykles, nes santykinė paklaida retai kada būna virš 100 procentų.$msg26$),
    ('d4fd390e-5d40-48e7-a8c4-d0244644f31e'::uuid, $msg27$**1. Vertinimas pagal punktus:**
* **Pavadinimas (0,5/0,5 tšk.):** Pavadinimas užrašytas tiksliai.
* **Tikslas (1/1 tšk.):** Suformuluotas tiksliai ir aiškiai.
* **Hipotezė (1/1 tšk.):** Logiška ir patikrinama („Jei pridedame daugiau svarelių...“).
* **Priemonės (0,5/0,5 tšk.):** Išvardintos visos 4 priemonės.
* **Teorija ir formulės (3/3 tšk.):** Pateikta reikiama teorija ir visos 3 pagrindinės formulės.
* **Matavimai (3/3 tšk.):** Tvarkinga lentelė, atlikti visi 3 žingsniai po 3 bandymus.
* **Skaičiavimai (3/3 tšk.):** Visi dydžiai (vidurkiai, paklaidos, svoriai, koeficientai) apskaičiuoti teisingai.
* **Rezultatų užrašymas (0/1 tšk.):** Gauti koeficientai atskirai po lentele neužrašyti.
* **Išvada (2/3 tšk.):** Atsakyta į hipotezę ir netiesiogiai atsakytas darbo tikslas (paminėta, kad koeficientas išlieka pastovus), tačiau neįvertintos paklaidos.
* **Refleksija (1/1 tšk.):** Refleksija parašyta.

**2. Bendra taškų suma:** 15/17 tšk.

**3. Galutinis pažymys:** 9

**4. Patarimas:** Ieva, šauniai padirbėta. Kitą kartą nepamiršk po lentele aiškiai išrašyti gautų galutinių atsakymų ir išvadoje padiskutuoti, iš kur galėjo atsirasti matavimo paklaidos (pvz., netikslus jėgos palaikymas traukiant).$msg27$),
    ('816ccf1a-d18d-443d-8c4f-8c218479b505'::uuid, $msg28$**1. Vertinimas pagal punktus:**
* **Pavadinimas (0,5/0,5 tšk.):** Yra ir tikslus.
* **Tikslas (1/1 tšk.):** Suformuluotas puikiai.
* **Hipotezė (1/1 tšk.):** Išsami ir logiška.
* **Priemonės (0,5/0,5 tšk.):** Išvardintos visos.
* **Teorija ir formulės (3/3 tšk.):** Formulės ir teorija pateiktos pilnai.
* **Matavimai (3/3 tšk.):** Pilna ir tvarkinga lentelė.
* **Skaičiavimai (3/3 tšk.):** Skaičiavimai atlikti be klaidų.
* **Rezultatų užrašymas (1/1 tšk.):** Rezultatai labai aiškiai išrašyti po lentele.
* **Išvada (1/3 tšk.):** Išvada gana skurdi („Pavyko apskaičiuoti...“). Užskaitytas tik atsakymas į tikslą. Neaišku, ar hipotezė pasitvirtino, paklaidos neaptartos.
* **Refleksija (1/1 tšk.):** Yra.

**2. Bendra taškų suma:** 15/17 tšk.

**3. Galutinis pažymys:** 9

**4. Patarimas:** Kerniau, labai stiprus techninis darbas ir tvarkingi skaičiavimai. Tačiau išvada turi būti mokslinė – joje privalai aiškiai patvirtinti/paneigti savo hipotezę ir apmąstyti paklaidas.$msg28$),
    ('26e25c3d-0636-44a9-a0ed-632e84bb8a54'::uuid, $msg29$**1. Vertinimas pagal punktus:**
* **Pavadinimas (0,5/0,5 tšk.):** Tikslus.
* **Tikslas (1/1 tšk.):** Suformuluotas tiksliai.
* **Hipotezė (1/1 tšk.):** Trumpa, bet patikrinama.
* **Priemonės (0,5/0,5 tšk.):** Visos 4 išvardintos.
* **Teorija ir formulės (3/3 tšk.):** Pilna teorija su 3 formulėmis.
* **Matavimai (3/3 tšk.):** Pilnai užpildyta lentelė.
* **Skaičiavimai (3/3 tšk.):** Visi skaičiavimai teisingi.
* **Rezultatų užrašymas (0/1 tšk.):** Atsakymai atskirai neišrašyti.
* **Išvada (2/3 tšk.):** Atsakyta į hipotezę ir nurodytas trinties koeficiento pastovumas (tikslas), bet trūksta paklaidų įvertinimo.
* **Refleksija (1/1 tšk.):** Yra.

**2. Bendra taškų suma:** 15/17 tšk.

**3. Galutinis pažymys:** 9

**4. Patarimas:** Atėne, gražus darbas. Skaičiavimai atlikti puikiai. Kitą kartą išvadoje prisimink pakomentuoti, kodėl rezultatai (koeficientai) šiek tiek svyruoja – tam įtakos turi matavimo paklaidos.$msg29$),
    ('d81dbdf2-c4fa-42fa-b120-879e34aee042'::uuid, $msg30$**1. Vertinimas pagal punktus:**
* **Pavadinimas (0,5/0,5 tšk.):** Yra, tikslus.
* **Tikslas (1/1 tšk.):** Puikus.
* **Hipotezė (1/1 tšk.):** Logiška ir puikiai suformuluota.
* **Priemonės (0,5/0,5 tšk.):** Išvardintos visos.
* **Teorija ir formulės (3/3 tšk.):** Teorija parašyta tobulai.
* **Matavimai (3/3 tšk.):** Visi tiesioginiai matavimai atlikti.
* **Skaičiavimai (3/3 tšk.):** Nepaisant mažos klaidelės užrašuose su 0,3 (parašyta 0,2, bet atsakymas 3,84 gautas iš 0,3), bendri skaičiavimai lentelėje atlikti teisingai.
* **Rezultatų užrašymas (1/1 tšk.):** Rezultatai aiškiai surašyti žemiau prie „10.“ punkto.
* **Išvada (1/3 tšk.):** Aptarta tik hipotezė. Neatsakyta į darbo tikslą (koks tas koeficientas?) ir neįvertintos paklaidos.
* **Refleksija (1/1 tšk.):** Yra.

**2. Bendra taškų suma:** 15/17 tšk.

**3. Galutinis pažymys:** 9

**4. Patarimas:** Jonė, tavo darbas labai nuoseklus ir gražus. „Nežinomas formules“ išmokti padės praktika. Išvadoje visada parašyk, kokius skaičius (rezultatus) gavai, ir paaiškink, kodėl jie skiriasi (įvertink matavimo paklaidas).$msg30$),
    ('f0ba4729-9048-437c-b26c-9edd7161f638'::uuid, $msg31$**1. Vertinimas pagal punktus:**
* **Pavadinimas (0,5/0,5 tšk.):** Yra.
* **Tikslas (1/1 tšk.):** Yra.
* **Hipotezė (0/1 tšk.):** Visiškai nėra.
* **Priemonės (0,5/0,5 tšk.):** Išvardintos.
* **Teorija ir formulės (3/3 tšk.):** Aprašyta pilnai.
* **Matavimai (3/3 tšk.):** Lentelė pilnai užpildyta.
* **Skaičiavimai (3/3 tšk.):** Skaičiavimai atlikti teisingai, rezultatai aiškūs.
* **Rezultatų užrašymas (0/1 tšk.):** Po lentele neparašyti.
* **Išvada (0/3 tšk.):** Nėra.
* **Refleksija (0/1 tšk.):** Nėra.

**2. Bendra taškų suma:** 11/17 tšk.

**3. Galutinis pažymys:** 6

**4. Patarimas:** Judre, pradžia ir techninė darbo dalis (skaičiavimai) atlikti tobulai. Tačiau praradai labai daug taškų, nes neparašei darbo išvados, hipotezės ir refleksijos. Visada užbaik laboratoriunį darbą iki galo.$msg31$),
    ('c4ebee83-379c-4bc3-b93f-0f5106d8a682'::uuid, $msg32$**1. Vertinimas pagal punktus:**
* **Pavadinimas (0,5/0,5 tšk.):** Yra.
* **Tikslas (1/1 tšk.):** Yra.
* **Hipotezė (1/1 tšk.):** Logiška ir aiški.
* **Priemonės (0,5/0,5 tšk.):** Išvardintos.
* **Teorija ir formulės (3/3 tšk.):** Pateiktos visos trys formulės.
* **Matavimai (3/3 tšk.):** Matavimai atlikti 3 žingsniais.
* **Skaičiavimai (3/3 tšk.):** Visos vertės suskaičiuotos teisingai ir atskleistos pačiose lentelės celėse.
* **Rezultatų užrašymas (0/1 tšk.):** Kaip atskiras punktas išvados ar rezultatų bloke jie neišrašyti.
* **Išvada (2/3 tšk.):** Patvirtinta hipotezė, netiesiogiai atsakytas tikslas, tačiau pamiršta padiskutuoti apie matavimų paklaidas.
* **Refleksija (1/1 tšk.):** Yra.

**2. Bendra taškų suma:** 15/17 tšk.

**3. Galutinis pažymys:** 9

**4. Patarimas:** Evita, puikus darbas. Kad gautum maksimalų įvertinimą, išvadą formuok iš 3 dalių: 1. Tikslas (koks koeficientas gautas?); 2. Hipotezė (pasitvirtino?); 3. Kodėl rezultatai nėra idealūs? (matavimų netikslumai, paklaidos).$msg32$),
    ('6cc6621b-7a7a-420f-98ed-25f94cc61151'::uuid, $msg33$**1. Vertinimas pagal punktus:**
* **Pavadinimas (0/0,5 tšk.):** Yra tik „Laboratorinis darbas“, trūksta oficialaus pavadinimo.
* **Tikslas (1/1 tšk.):** Yra, tikslus.
* **Hipotezė (1/1 tšk.):** Labai profesionaliai suformuluota.
* **Priemonės (0,5/0,5 tšk.):** Išvardintos.
* **Teorija ir formulės (3/3 tšk.):** Pilna teorija ir formulės.
* **Matavimai (3/3 tšk.):** Atlikta pilnai.
* **Skaičiavimai (3/3 tšk.):** Viskas suskaičiuota ir sudėta į lentelę.
* **Rezultatų užrašymas (1/1 tšk.):** Skaičiavimų rezultatai tvarkingai surašyti dešinėje pusėje už lentelės.
* **Išvada (3/3 tšk.):** Tobula išvada. Atsakyta į tikslą, patikrinta hipotezė ir, kas svarbiausia, įvertintos paklaidos.
* **Refleksija (1/1 tšk.):** Yra.

**2. Bendra taškų suma:** 16,5/17 tšk.

**3. Galutinis pažymys:** 10

**4. Patarimas:** Juste, beveik idealus darbas. Skiriu 10 balų už nuostabiai suformuluotą hipotezę ir pilną, argumentuotą išvadą. Ateityje nepamiršk paties pirmojo žingsnio – darbo pavadinimo.$msg33$),
    ('a69c9176-cbf6-4406-81a6-36c0aedb5234'::uuid, $msg34$**1. Vertinimas pagal punktus:**
* **Pavadinimas (0,5/0,5 tšk.):** Yra.
* **Tikslas (1/1 tšk.):** Tikslus.
* **Hipotezė (1/1 tšk.):** Logiška.
* **Priemonės (0,5/0,5 tšk.):** Išvardintos.
* **Teorija ir formulės (3/3 tšk.):** Teorija pilna.
* **Matavimai (3/3 tšk.):** Matavimai atlikti pilnai.
* **Skaičiavimai (3/3 tšk.):** Matematika atlikta puikiai.
* **Rezultatų užrašymas (1/1 tšk.):** Atsakymai aiškiai išrašyti prie 10 punkto.
* **Išvada (1/3 tšk.):** Parašytas tik 1 sakinys atsakant į hipotezę. Neapibendrinti rezultatai, nepaminėtos paklaidos.
* **Refleksija (1/1 tšk.):** Nuoširdi ir gera refleksija.

**2. Bendra taškų suma:** 15/17 tšk.

**3. Galutinis pažymys:** 9

**4. Patarimas:** Ugne, formulių išsigąsti nereikia, su laiku prie jų priprasi. Tavo techninė dalis atlikta puikiai. Daugiau dėmesio skirk išvadai.$msg34$),
    ('315a8b54-0b1c-4fe8-bf46-2b1bbf00a468'::uuid, $msg35$**1. Vertinimas pagal punktus:**
* **Pavadinimas (0,5/0,5 tšk.):** Yra.
* **Tikslas (1/1 tšk.):** Yra.
* **Hipotezė (1/1 tšk.):** Logiška.
* **Priemonės (0,5/0,5 tšk.):** Yra visos.
* **Teorija ir formulės (3/3 tšk.):** Teorija ir 3 formulės vietoje.
* **Matavimai (3/3 tšk.):** Tvarkinga lentelė.
* **Skaičiavimai (3/3 tšk.):** Viskas atlikta teisingai.
* **Rezultatų užrašymas (0/1 tšk.):** Neišrašyta už lentelės.
* **Išvada (2/3 tšk.):** Atsakyta į tikslą ir hipotezę, bet pamiršta pakalbėti apie matavimo klaidų ir paklaidų įtaką.
* **Refleksija (1/1 tšk.):** Yra.

**2. Bendra taškų suma:** 15/17 tšk.

**3. Galutinis pažymys:** 9

**4. Patarimas:** Ugne, tvarkingas ir nuoseklus darbas. Kitą kartą pabandyk išvadoje analizuoti, kodėl koeficientas šiek tiek keitėsi, nors teoriškai turėtų būti vienodas – taip pasieksi maksimalų balą.$msg35$),
    ('727e0c13-50fe-4d80-b2b5-dd7b05e94586'::uuid, $msg36$**1. Vertinimas pagal punktus:**
* **Pavadinimas (0,5/0,5 tšk.):** Yra.
* **Tikslas (1/1 tšk.):** Yra.
* **Hipotezė (1/1 tšk.):** Puiki, apimanti ir jėgą, ir koeficientą.
* **Priemonės (0,5/0,5 tšk.):** Išvardintos.
* **Teorija ir formulės (3/3 tšk.):** Aprašyta pilnai.
* **Matavimai (3/3 tšk.):** Lentelė pilna ir teisinga.
* **Skaičiavimai (3/3 tšk.):** Matematika atlikta puikiai.
* **Rezultatų užrašymas (1/1 tšk.):** Išrašyta prie 10 punkto.
* **Išvada (3/3 tšk.):** Nuostabi išvada – atsakyta į hipotezę, aptartas koeficientas ir jo svyravimai dėl matavimo paklaidų.
* **Refleksija (1/1 tšk.):** Yra.

**2. Bendra taškų suma:** 17/17 tšk.

**3. Galutinis pažymys:** 10

**4. Patarimas:** Meda, tobulas laboratorinis darbas. Skaičiavimai tikslūs, eiga detali, išvada labai brandi. Taip ir toliau.$msg36$),
    ('b567d6e0-6dea-40d6-b97b-52f7540f7dfa'::uuid, $msg37$**1. Vertinimas pagal punktus:**
* **Pavadinimas (0,5/0,5 tšk.):** Yra.
* **Tikslas (1/1 tšk.):** Yra.
* **Hipotezė (1/1 tšk.):** Logiška.
* **Priemonės (0,5/0,5 tšk.):** Yra.
* **Teorija ir formulės (3/3 tšk.):** Yra.
* **Matavimai (3/3 tšk.):** Matavimai yra.
* **Skaičiavimai (2/3 tšk.):** Pastebima fizikinė skaičiavimo klaida: skaičiuojant svorį P nebuvo dauginta iš g (9,8), naudoti tiesiog svoriai 2,3,4. Dėl to gautas nerealus trinties koeficientas (27,5). Tačiau mokinė stengėsi taikyti formulę.
* **Rezultatų užrašymas (1/1 tšk.):** Išrašyti skaičiavimų zonoje.
* **Išvada (3/3 tšk.):** Labai gera išvada: atsakytas tikslas, hipotezė ir netgi detaliai aptartos paklaidos („ant kiek stipriai tempė dinamometrą“).
* **Refleksija (1/1 tšk.):** Yra.

**2. Bendra taškų suma:** 16/17 tšk.

**3. Galutinis pažymys:** 9

**4. Patarimas:** Egle, tavo aprašymas ir teorijos supratimas labai geras, ypač džiugina išvada. Tiesiog kitą kartą prisimink, kad svoris (P) matuojamas niutonais, todėl masę dar reikėjo padauginti iš 10. Trinties koeficientas paprastai būna mažesnis už 1.$msg37$),
    ('c844150b-4eaf-4af3-b46f-78e7958306c5'::uuid, $msg38$**1. Vertinimas pagal punktus:**
* **Pavadinimas (0,5/0,5 tšk.):** Užskaityta bendrai (maksimalus balas).
* **Tikslas (1/1 tšk.):** Užskaityta bendrai (maksimalus balas).
* **Hipotezė (1/1 tšk.):** Tavo individuali hipotezė puiki – aiški, logiška ir atspindi darbo esmę (paminėtas koeficiento nepriklausomumas nuo svorio).
* **Priemonės (0,5/0,5 tšk.):** Užskaityta bendrai (maksimalus balas).
* **Teorija ir formulės (3/3 tšk.):** Užskaityta bendrai (maksimalus balas).
* **Matavimai (3/3 tšk.):** Bendra lentelė užpildyta tvarkingai, atlikti visi bandymai.
* **Skaičiavimai (3/3 tšk.):** Bendrai atlikti skaičiavimai teisingi.
* **Rezultatų užrašymas (1/1 tšk.):** Užskaityta bendrai (atsakymai aiškiai išrašyti).
* **Išvada (2/3 tšk.):** Tavo asmeninėje išvadoje labai gražiai atsakyta į hipotezę ir apibendrintas tikslas (nustatyta, kad koeficientas panašus/nepriklauso nuo svorio). Tačiau pritrūko trečiojo komponento – matavimų paklaidų įvertinimo (kodėl tie koeficientai šiek tiek skyrėsi).
* **Refleksija (1/1 tšk.):** Tavo asmeninė refleksija yra.

**2. Bendra taškų suma:** 16/17 tšk.

**3. Galutinis pažymys:** 9

**4. Patarimas:** Domantai, tavo darbas atrodo labai stipriai. Eksperimentas pavyko puikiai, o tavo asmeninė hipotezė buvo labai brandi. Kad gautum 10-tuką, ateityje išvadoje visada skirk vieną sakinį paklaidoms – aptark, kas galėjo lemti nedidelius netikslumus eksperimento metu.$msg38$),
    ('1d26d236-82ce-4fea-96c8-23d50bd29f7a'::uuid, $msg39$**1. Vertinimas pagal punktus:**
* **Pavadinimas (0,5/0,5 tšk.):** Užskaityta bendrai (maksimalus balas).
* **Tikslas (1/1 tšk.):** Užskaityta bendrai (maksimalus balas).
* **Hipotezė (1/1 tšk.):** Tavo individuali hipotezė suformuluota labai tiksliai ir moksliškai.
* **Priemonės (0,5/0,5 tšk.):** Užskaityta bendrai (maksimalus balas).
* **Teorija ir formulės (3/3 tšk.):** Užskaityta bendrai (maksimalus balas).
* **Matavimai (3/3 tšk.):** Bendra lentelė užpildyta be priekaištų.
* **Skaičiavimai (3/3 tšk.):** Bendrai atlikti skaičiavimai be klaidų.
* **Rezultatų užrašymas (1/1 tšk.):** Užskaityta bendrai.
* **Išvada (1/3 tšk.):** Tavo asmeninėje išvadoje atsakyta tik į vieną dalį – patvirtinta hipotezės dalis apie jėgos didėjimą. Tačiau pamiršai atsakyti į paties darbo tikslą (ką sužinojome apie koeficientą?) ir neaptarei matavimo paklaidų.
* **Refleksija (1/1 tšk.):** Tavo asmeninė refleksija yra.

**2. Bendra taškų suma:** 15/17 tšk.

**3. Galutinis pažymys:** 9

**4. Patarimas:** Edvinai, bendras komandinis darbas laboratorijoje pavyko puikiai, skaičiavimai labai tvarkingi. Visgi, nors tavo hipotezė buvo ideali, išvadoje ją šiek tiek „pametei“ – neapibendrinai gauto trinties koeficiento ir neįvertinai paklaidų.$msg39$),
    ('afd89ce4-e8c2-449a-9c96-d5b2bf2a6f7b'::uuid, $msg40$**1. Vertinimas pagal punktus:**
* **Pavadinimas (0,5/0,5 tšk.):** Yra.
* **Tikslas (1/1 tšk.):** Yra.
* **Hipotezė (1/1 tšk.):** Yra.
* **Priemonės (0,5/0,5 tšk.):** Yra.
* **Teorija ir formulės (3/3 tšk.):** Yra.
* **Matavimai (3/3 tšk.):** Matavimai atlikti.
* **Skaičiavimai (2/3 tšk.):** Yra matematinė klaida skaičiuojant koeficientą (0,5 / 2 = 0,25, o ne 0,025). 
* **Rezultatų užrašymas (0/1 tšk.):** Neišrašyta atskirai.
* **Išvada (2/3 tšk.):** Atsakyta tikslas ir hipotezė.
* **Refleksija (1/1 tšk.):** Yra.

**2. Bendra taškų suma:** 14/17 tšk.

**3. Galutinis pažymys:** 8

**4. Patarimas:** Aurelija, atidžiau atlik matematinius skaičiavimus ir užrašyk galutinius rezultatus.$msg40$),
    ('4f13bc06-6fa3-4aaf-978a-952d4c4296b7'::uuid, $msg41$**1. Vertinimas pagal punktus:**
* **Pavadinimas (0/0,5 tšk.):** Nėra.
* **Tikslas (0/1 tšk.):** Nėra.
* **Hipotezė (1/1 tšk.):** Yra.
* **Priemonės (0/0,5 tšk.):** Nėra.
* **Teorija ir formulės (0/3 tšk.):** Nėra.
* **Matavimai (3/3 tšk.):** Atlikti.
* **Skaičiavimai (2/3 tšk.):** Klaida formulių taikyme (nesureagavo, kad Ftr turi būti Niutonais (parašyta 55), todėl gautas nerealus koeficientas 27,5).
* **Rezultatų užrašymas (0/1 tšk.):** Nėra.
* **Išvada (2/3 tšk.):** Yra 2 dalys iš 3 (be paklaidų analizės).
* **Refleksija (1/1 tšk.):** Yra.

**2. Bendra taškų suma:** 9/17 tšk.

**3. Galutinis pažymys:** 5

**4. Patarimas:** Barbora, daug taškų praradai, nes trūko pilnos darbo struktūros (pirmųjų punktų). Tikiu, kad kitą kartą tau pavyks gauti aukštesnį įvertinimą.$msg41$),
    ('2b11cf50-c397-43cd-b8e5-80048fd75959'::uuid, $msg42$**1. Vertinimas pagal punktus:**
* **Pavadinimas (0,5/0,5 tšk.):** Nėra.
* **Tikslas (1/1 tšk.):** Yra.
* **Hipotezė (1/1 tšk.):** Yra.
* **Priemonės (0,5/0,5 tšk.):** Yra.
* **Teorija ir formulės (3/3 tšk.):** Yra.
* **Matavimai (3/3 tšk.):** Yra.
* **Skaičiavimai (2/3 tšk.):** Skaičiavimuose įsivėlė klaidų (Svoris P paliktas gramais, koeficientas apskaičiuotas su klaidomis).
* **Rezultatų užrašymas (0/1 tšk.):** Nėra atskirai.
* **Išvada (2/3 tšk.):** Yra, atsakyti du iš trijų punktų.
* **Refleksija (1/1 tšk.):** Yra.

**2. Bendra taškų suma:** 14/17 tšk.

**3. Galutinis pažymys:** 8

**4. Patarimas:** Milena, masė turi būti paverstas į kilogramus ir padaugintas iš 10, kad gautume svorio jėgą.$msg42$),
    ('c50ecfd1-bb36-4df1-97a1-544707641251'::uuid, $msg43$**1. Vertinimas pagal punktus:**
* **Pavadinimas (0,5/0,5 tšk.):** Užskaityta bendrai.
* **Tikslas (1/1 tšk.):** Užskaityta bendrai.
* **Hipotezė (1/1 tšk.):** Yra užrašyta bendrame lape, patikrinama.
* **Priemonės (0,5/0,5 tšk.):** Užskaityta bendrai (maksimalus balas).
* **Teorija ir formulės (3/3 tšk.):** Užskaityta bendrai pagal patikslinimą (maksimalus balas).
* **Matavimai (2/3 tšk.):** Lentelė užpildyta, tačiau 1 žingsnyje atlikti tik 2 bandymai vietoje reikalaujamų 3.
* **Skaičiavimai (3/3 tšk.):** Lentelės skaičiavimai atlikti teisingai.
* **Rezultatų užrašymas (0/1 tšk.):** Atskirai po lentele ar išvadoje atsakymai neišrašyti.
* **Išvada (1/3 tšk.):** Išvadoje (bendrame lape) užsimenama tik apie tai, kad hipotezė pasitvirtino. Pamirštas tikslas ir paklaidos.
* **Refleksija (1/1 tšk.):** Yra užrašyta.

**2. Bendra taškų suma:** 13/17 tšk.

**3. Galutinis pažymys:** 8

**4. Patarimas:** Adai, eksperimento dalį ir skaičiavimus atlikai šauniai. Kitam kartui liko pasitobulinti tik išvadų rašyme – išvada turi būti išsamesnė: būtinai nurodyk konkretų gautą rezultatą (koeficientą) ir padiskutuok, iš kur galėjo atsirasti matavimo klaidų.$msg43$),
    ('61aa087b-67ba-4f6d-824a-570df9039835'::uuid, $msg44$**1. Vertinimas pagal punktus:**
* **Pavadinimas (0,5/0,5 tšk.):** Tavo asmeniniame lape parašyta, užskaityta bendrai.
* **Tikslas (1/1 tšk.):** Tavo asmeniniame lape parašyta, užskaityta bendrai.
* **Hipotezė (1/1 tšk.):** Tavo asmeninė hipotezė yra logiška.
* **Priemonės (0,5/0,5 tšk.):** Užskaityta bendrai pagal patikslinimą (maksimalus balas).
* **Teorija ir formulės (3/3 tšk.):** Užskaityta bendrai pagal patikslinimą (maksimalus balas).
* **Matavimai (2/3 tšk.):** Vertinami bendri matavimai (Ado ir tavo bendrame lape 1 žingsnyje trūksta 1 bandymo).
* **Skaičiavimai (3/3 tšk.):** Bendri skaičiavimai atlikti teisingai.
* **Rezultatų užrašymas (0/1 tšk.):** Nėra išrašyta.
* **Išvada (1/3 tšk.):** Tavo asmeninė išvada labai trumpa – atsakyta tik į hipotezę. Neaptartas koeficientas ir paklaidos.
* **Refleksija (1/1 tšk.):** Tavo refleksija yra.

**2. Bendra taškų suma:** 13/17 tšk.

**3. Galutinis pažymys:** 8

**4. Patarimas:** Emilijau, praktinė dalis (skaičiavimai) atlikta solidžiai. Patarimas ateičiai – išvadą visada formuok iš trijų dalių (atsakymas į tikslą, atsakymas į hipotezę ir paklaidų apžvalga). Tuomet gausi patį aukščiausią įvertinimą.$msg44$),
    ('c698b26a-3844-48fa-94f8-08cf87884fcc'::uuid, $msg45$**1. Vertinimas pagal punktus:**
* **Pavadinimas (0,5/0,5 tšk.):** Yra.
* **Tikslas (1/1 tšk.):** Yra.
* **Hipotezė (1/1 tšk.):** Prirašyta vėliau, bet yra ir logiška.
* **Priemonės (0,5/0,5 tšk.):** Yra.
* **Teorija ir formulės (3/3 tšk.):** Pilna teorija ir formulės.
* **Matavimai (3/3 tšk.):** Yra lentelė.
* **Skaičiavimai (2/3 tšk.):** Įsivėlė tokia pati fizikos klaida kaip kelioms klasiokėms (dinamometras rodo N, o tu paėmei kaip 50, vietoje 0,5 N, o masės nepadauginai iš g, gautas nerealus $\mu=27,5$). Bet darbo eiga buvo vykdoma.
* **Rezultatų užrašymas (0/1 tšk.):** Neišrašyta atskirai.
* **Išvada (2/3 tšk.):** Paklaidos neįvertintos.
* **Refleksija (1/1 tšk.):** Yra.

**2. Bendra taškų suma:** 14/17 tšk.

**3. Galutinis pažymys:** 8

**4. Patarimas:** Liepa, gražus ir struktūruotas darbas. Atkreipk dėmesį į matavimo vienetus skaičiuojant. Jei trinties koeficientas gaunasi didesnis už 1 (o čia gavosi 27), greičiausiai supainioti vienetai. Šiaip padirbėta šauniai.$msg45$),
    ('95f5c1a8-7310-4345-8cf2-2e386ecc3632'::uuid, $msg46$**1. Vertinimas pagal punktus:**
* **Pavadinimas (0,5/0,5 tšk.):** Yra.
* **Tikslas (1/1 tšk.):** Yra.
* **Hipotezė (1/1 tšk.):** Logiška.
* **Priemonės (0,5/0,5 tšk.):** Yra.
* **Teorija ir formulės (3/3 tšk.):** Puikiai išdėstyta.
* **Matavimai (3/3 tšk.):** Lentelė pilna ir aiški.
* **Skaičiavimai (3/3 tšk.):** Be priekaištų.
* **Rezultatų užrašymas (1/1 tšk.):** Skiltyje „Rezultatai“ puikiai išrašyti atsakymai.
* **Išvada (3/3 tšk.):** Pilnavertė išvada – atsakytas tikslas, patvirtinta hipotezė, padiskutuota apie paklaidas („prietaisų netikslumai“).
* **Refleksija (1/1 tšk.):** Yra.

**2. Bendra taškų suma:** 17/17 tšk.

**3. Galutinis pažymys:** 10

**4. Patarimas:** Laurita, idealus darbas, Laurita. Labai tvarkingas, nuoseklus, puikiai supranti tai, ką darai. Laikyk tokį patį lygį ir toliau.$msg46$),
    ('acb87883-6712-4919-8ffd-9f542df4f4d4'::uuid, $msg47$1. **Pavadinimas (0,5/0,5 tšk.):** Parašytas tiksliai.
2. **Tikslas (1/1 tšk.):** Suformuluotas tiksliai ir atspindi esmę.
3. **Hipotezė (1/1 tšk.):** Palikta logiška ir tikrinama hipotezė.
4. **Prietaisai ir priemonės (0,5/0,5 tšk.):** Išvardinti visi 4 prietaisai.
5. **Teorija ir formulės (3/3 tšk.):** Pateiktos visos pagrindinės formulės.
6. **Matavimai (3/3 tšk.):** Lentelė užpildyta, atlikti 3 žingsniai po 3 bandymus.
7. **Skaičiavimai (2/3 tšk.):** Yra tuščių laukelių ir smulkių skaičiavimo netikslumų.
8. **Rezultatų užrašymas (0/1 tšk.):** Gauti koeficientai nėra išrašyti atskirai už lentelės ribų.
9. **Išvada (2/3 tšk.):** Atsakyta į tikslą ir patvirtinta hipotezė, bet neįvertintos paklaidos.
10. **Refleksija (1/1 tšk.):** Refleksija pateikta.
* **Bendra taškų suma:** 14/17 tšk.
* **Galutinis pažymys:** 8
* **Patarimas:** Milda, nepamiršk išvadoje aptarti matavimo paklaidų, o galutinius gautus rezultatus visada aiškiai išrašyk atskiroje skiltyje po lentele.$msg47$),
    ('7b5b526d-4525-46fa-9702-d355c9650b3e'::uuid, $msg48$1. **Pavadinimas (0,5/0,5 tšk.):** Parašytas tiksliai.
2. **Tikslas (1/1 tšk.):** Suformuluotas teisingai.
3. **Hipotezė (1/1 tšk.):** Logiška, laikytasi tinkamos struktūros.
4. **Prietaisai ir priemonės (0,5/0,5 tšk.):** Išvardintos visos 4 priemonės.
5. **Teorija ir formulės (3/3 tšk.):** Pateiktos visos reikiamos formulės.
6. **Matavimai (3/3 tšk.):** Lentelė pilnai ir tvarkingai užpildyta.
7. **Skaičiavimai (2/3 tšk.):** Yra akivaizdi skaičiavimo klaida paskutiniame žingsnyje (0,73 / 3,94 nėra 0,37).
8. **Rezultatų užrašymas (0/1 tšk.):** Rezultatai neišrašyti atskirai.
9. **Išvada (1/3 tšk.):** Tik patvirtinta hipotezė, neatsakyta į tikslą ir neaptartos paklaidos.
10. **Refleksija (1/1 tšk.):** Refleksija pateikta.
* **Bendra taškų suma:** 13/17 tšk.
* **Galutinis pažymys:** 8
* **Patarimas:** Norbertai, išvada turi susidėti iš 3 dalių (tikslas, hipotezė, paklaidos), taip pat atidžiau tikrink savo skaičiavimus kalkuliatoriumi.$msg48$),
    ('6e2039e3-e056-463a-b7bd-69442bdd3498'::uuid, $msg49$1. **Pavadinimas (0,5/0,5 tšk.):** Parašytas tiksliai.
2. **Tikslas (1/1 tšk.):** Suformuluotas tobulai.
3. **Hipotezė (1/1 tšk.):** Logiška ir tikrinama.
4. **Prietaisai ir priemonės (0,5/0,5 tšk.):** Išvardinti visi 4.
5. **Teorija ir formulės (3/3 tšk.):** Pateikta teorija ir visos formulės.
6. **Matavimai (3/3 tšk.):** Lentelė pilnai užpildyta.
7. **Skaičiavimai (3/3 tšk.):** Visi dydžiai teisingai apskaičiuoti ir surašyti.
8. **Rezultatų užrašymas (1/1 tšk.):** Rezultatai aiškiai išrašyti sprendime už lentelės.
9. **Išvada (3/3 tšk.):** Atsakyta į tikslą, aptarta hipotezė ir paklaidos.
10. **Refleksija (1/1 tšk.):** Puiki refleksija.
* **Bendra taškų suma:** 17/17 tšk.
* **Galutinis pažymys:** 10
* **Patarimas:** Saule, puikus darbas, taip ir toliau. Ateityje galutinius atsakymus gali dar aiškiau išskirti parašydama žodį „Rezultatai“.$msg49$),
    ('8c25a031-06bd-49da-854c-4461b7865778'::uuid, $msg50$1. **Pavadinimas (0,5/0,5 tšk.):** Parašytas tiksliai.
2. **Tikslas (1/1 tšk.):** Suformuluotas teisingai.
3. **Hipotezė (1/1 tšk.):** Logiška ir moksliška.
4. **Prietaisai ir priemonės (0,5/0,5 tšk.):** Išvardinti visi 4.
5. **Teorija ir formulės (3/3 tšk.):** Pateiktos visos formulės.
6. **Matavimai (3/3 tšk.):** Lentelė pilnai užpildyta.
7. **Skaičiavimai (3/3 tšk.):** Visi dydžiai apskaičiuoti teisingai.
8. **Rezultatų užrašymas (1/1 tšk.):** Sukurta atskira „Rezultatai“ skiltis.
9. **Išvada (3/3 tšk.):** Aptartas tikslas, hipotezė ir paklaidos.
10. **Refleksija (1/1 tšk.):** Pateikta.
* **Bendra taškų suma:** 17/17 tšk.
* **Galutinis pažymys:** 10
* **Patarimas:** Viktorija, neturiu jokių priekaištų, darbas atliktas tobulai pagal visus reikalavimus.$msg50$),
    ('c3aca5f0-490d-4541-9c0a-7aad501434a2'::uuid, $msg51$1. **Pavadinimas (0,5/0,5 tšk.):** Parašytas tiksliai.
2. **Tikslas (1/1 tšk.):** Suformuluotas teisingai.
3. **Hipotezė (1/1 tšk.):** Logiška ir tikrinama.
4. **Prietaisai ir priemonės (0,5/0,5 tšk.):** Išvardinti visi 4.
5. **Teorija ir formulės (3/3 tšk.):** Pateikta reikiama teorija ir formulės.
6. **Matavimai (3/3 tšk.):** Lentelė užpildyta pilnai.
7. **Skaičiavimai (3/3 tšk.):** Viskas suskaičiuota teisingai.
8. **Rezultatų užrašymas (1/1 tšk.):** Rezultatai aiškiai išrašyti.
9. **Išvada (2/3 tšk.):** Atsakyta į tikslą ir hipotezę, bet neįvertintos paklaidos.
10. **Refleksija (1/1 tšk.):** Pateikta.
* **Bendra taškų suma:** 16/17 tšk.
* **Galutinis pažymys:** 9
* **Patarimas:** Karolina, rašydama išvadą niekada nepamiršk įvertinti ir aptarti, dėl kokių priežasčių galėjo atsirasti matavimo paklaidos.$msg51$),
    ('2e1eea72-0dd4-4268-9f20-779d365ce576'::uuid, $msg52$1. **Pavadinimas (0,5/0,5 tšk.):** Parašytas tiksliai.
2. **Tikslas (1/1 tšk.):** Suformuluotas teisingai.
3. **Hipotezė (1/1 tšk.):** Suformuluota puikiai ir logiškai.
4. **Prietaisai ir priemonės (0,5/0,5 tšk.):** Išvardinti visi 4.
5. **Teorija ir formulės (3/3 tšk.):** Pateikta.
6. **Matavimai (3/3 tšk.):** Tvarkingai užpildyta lentelė.
7. **Skaičiavimai (3/3 tšk.):** Visi skaičiavimai lentelėje teisingi.
8. **Rezultatų užrašymas (1/1 tšk.):** Aiški rezultatų skiltis.
9. **Išvada (2/3 tšk.):** Aptarta hipotezė ir paklaidos, bet trūksta konkretaus atsakymo į darbo tikslą (kokį koeficientą nustatėte).
10. **Refleksija (1/1 tšk.):** Pateikta.
* **Bendra taškų suma:** 16/17 tšk.
* **Galutinis pažymys:** 9
* **Patarimas:** Jori, išvada buvo labai glausta. Nors paminėjai, kad vertinai paklaidas, reikėtų parašyti konkrečiau (kokios jos, dėl ko atsirado), taip pat aiškiai patvirtinti, kad pasiekei tikslą.$msg52$),
    ('12f214a9-6538-40c5-852f-abe046878c0c'::uuid, $msg53$1. **Pavadinimas (0,5/0,5 tšk.):** Yra tikslus.
2. **Tikslas (1/1 tšk.):** Suformuluotas teisingai.
3. **Hipotezė (1/1 tšk.):** Labai gera, išsami hipotezė.
4. **Prietaisai ir priemonės (0,5/0,5 tšk.):** Visi išvardinti.
5. **Teorija ir formulės (3/3 tšk.):** Pateikta pilna teorija ir visos formulės.
6. **Matavimai (3/3 tšk.):** Lentelė užpildyta puikiai.
7. **Skaičiavimai (3/3 tšk.):** Skaičiavimai atlikti teisingai.
8. **Rezultatų užrašymas (0,5/1 tšk.):** Gauti galutiniai atsakymai neišrašyti atskiroje skiltyje už lentelės ribų.
9. **Išvada (3/3 tšk.):** Nuodugni išvada su visais 3 elementais.
10. **Refleksija (1/1 tšk.):** Pateikta.
* **Bendra taškų suma:** 16,5/17 tšk.
* **Galutinis pažymys:** 10
* **Patarimas:** Aurelija, formuok įprotį pačiame darbo gale (prieš išvadą) aiškiai išrašyti galutinius eksperimento rezultatus. Viskas kitkas – nepriekaištinga.$msg53$),
    ('d2a255fc-7b9d-4010-a405-3b98a48b7550'::uuid, $msg54$1. **Pavadinimas (0,5/0,5 tšk.):** Yra.
2. **Tikslas (1/1 tšk.):** Teisingas.
3. **Hipotezė (1/1 tšk.):** Logiška ir tinkama.
4. **Prietaisai ir priemonės (0,5/0,5 tšk.):** Visi 4 išvardinti.
5. **Teorija ir formulės (3/3 tšk.):** Pateiktos visos formulės.
6. **Matavimai (3/3 tšk.):** Lentelė užpildyta.
7. **Skaičiavimai (3/3 tšk.):** Suskaičiuota ir surašyta į lentelę teisingai.
8. **Rezultatų užrašymas (0/1 tšk.):** Neišrašyti atskirai už lentelės.
9. **Išvada (1/3 tšk.):** Atsakyta tik į hipotezę. Neaptartas darbo tikslas ir paklaidos.
10. **Refleksija (1/1 tšk.):** Pateikta.
* **Bendra taškų suma:** 14/17 tšk.
* **Galutinis pažymys:** 8
* **Patarimas:** Silvija, išvada negali būti tik vienas sakinys apie hipotezę. Joje apibendrink visą darbą, patvirtink, ar pavyko pasiekti tikslą, ir paaiškink gautas paklaidas.$msg54$),
    ('960e27ab-21dd-455a-b0a3-b884e35ef97f'::uuid, $msg55$1. **Pavadinimas (0/0,5 tšk.):** Parašyta tik „Laboratorinis darbas“, trūksta pilno pavadinimo.
2. **Tikslas (1/1 tšk.):** Suformuluotas teisingai.
3. **Hipotezė (1/1 tšk.):** Yra ir logiška.
4. **Prietaisai ir priemonės (0/0,5 tšk.):** Neišvardinti visiškai.
5. **Teorija ir formulės (0/3 tšk.):** Teorija ir formulės praleistos.
6. **Matavimai (3/3 tšk.):** Lentelė užpildyta ir tvarkinga.
7. **Skaičiavimai (3/3 tšk.):** Skaičiavimai lentelėje teisingi.
8. **Rezultatų užrašymas (1/1 tšk.):** Išrašyti atskirai (1. 2. 3.).
9. **Išvada (2/3 tšk.):** Aptarta hipotezė ir paminėtos paklaidos, bet aiškiai neatsakyta į tikslą.
10. **Refleksija (1/1 tšk.):** Pateikta.
* **Bendra taškų suma:** 12/17 tšk.
* **Galutinis pažymys:** 7
* **Patarimas:** Deividai, niekada nepraleisk privalomų struktūros dalių (priemonių ir teorijos), jos sudaro svarbią laboratorinio aprašo dalį.$msg55$),
    ('3c4dc263-e858-4033-b6f9-871355c08d25'::uuid, $msg56$1. **Pavadinimas (0,5/0,5 tšk.):** Yra.
2. **Tikslas (1/1 tšk.):** Suformuluotas teisingai.
3. **Hipotezė (0/1 tšk.):** Tai nėra mokslinė hipotezė (fokusas į pasiruošimą, o ne į fizikinius dėsningumus).
4. **Prietaisai ir priemonės (0,5/0,5 tšk.):** Yra.
5. **Teorija ir formulės (3/3 tšk.):** Pateikta.
6. **Matavimai (3/3 tšk.):** Lentelė užpildyta.
7. **Skaičiavimai (2/3 tšk.):** Padaryta esminė skaičiavimo klaida: verčiant masę vietoje 0,1 kg naudota 1 kg (bendras svoris gavosi virš 10 N, o koeficientas ypač mažas).
8. **Rezultatų užrašymas (0/1 tšk.):** Neišrašyta atskirai.
9. **Išvada (1/3 tšk.):** Atsakyta tik dėl tikslo, bet pamiršta hipotezė ir paklaidos.
10. **Refleksija (1/1 tšk.):** Pateikta.
* **Bendra taškų suma:** 12/17 tšk.
* **Galutinis pažymys:** 7
* **Patarimas:** Aiste, formuluojant hipotezę reikia spėti, kaip susiję fizikiniai dydžiai (pvz., kaip masė veikia trinties koeficientą). Taip pat būk atidesnė su matavimo vienetais.$msg56$),
    ('cba48be5-a8cd-4001-8d2a-fc27a1c4a505'::uuid, $msg57$1. **Pavadinimas (0,5/0,5 tšk.):** Yra.
2. **Tikslas (1/1 tšk.):** Teisingas.
3. **Hipotezė (1/1 tšk.):** Logiška.
4. **Prietaisai ir priemonės (0,5/0,5 tšk.):** Visi 4 išvardinti.
5. **Teorija ir formulės (3/3 tšk.):** Yra visos reikiamos formulės.
6. **Matavimai (3/3 tšk.):** Lentelė užpildyta.
7. **Skaičiavimai (3/3 tšk.):** Apskaičiuota teisingai.
8. **Rezultatų užrašymas (0/1 tšk.):** Neišrašyta atskirai už lentelės.
9. **Išvada (2/3 tšk.):** Aptarta hipotezė ir paminėtos paklaidos, tačiau trūksta aiškaus atsakymo į iškeltą tikslą.
10. **Refleksija (1/1 tšk.):** Pateikta.
* **Bendra taškų suma:** 15/17 tšk.
* **Galutinis pažymys:** 9
* **Patarimas:** Gabriele, nepamiršk rezultatų aiškiai išrašyti po lentele ir išvadoje atsakyti į visus keliamus klausimus.$msg57$),
    ('36b1a217-2da4-4a8d-8ea5-080d54cf0cf1'::uuid, $msg58$1. **Pavadinimas (0,5/0,5 tšk.):** Parašytas.
2. **Tikslas (1/1 tšk.):** Teisingas.
3. **Hipotezė (1/1 tšk.):** Puikiai suformuluota.
4. **Prietaisai ir priemonės (0,5/0,5 tšk.):** Visi 4.
5. **Teorija ir formulės (3/3 tšk.):** Yra viskas, ko reikalaujama.
6. **Matavimai (3/3 tšk.):** Lentelė pilnai užpildyta.
7. **Skaičiavimai (3/3 tšk.):** Skaičiavimai atlikti teisingai.
8. **Rezultatų užrašymas (1/1 tšk.):** Puikiai išskirta atskira skiltis.
9. **Išvada (3/3 tšk.):** Yra visi 3 elementai (tikslas, hipotezė, paklaidos).
10. **Refleksija (1/1 tšk.):** Refleksija pateikta.
* **Bendra taškų suma:** 17/17 tšk.
* **Galutinis pažymys:** 10
* **Patarimas:** Guste, nuostabiai atliktas ir aprašytas laboratorinis darbas. Taip ir toliau.$msg58$),
    ('dc8fcc74-f724-4b3c-914d-62a3bd84750d'::uuid, $msg59$1. **Pavadinimas (0,5/0,5 tšk.):** Parašytas.
2. **Tikslas (1/1 tšk.):** Teisingas.
3. **Hipotezė (0/1 tšk.):** Hipotezė nemokslinė (neprognozuoja dėsningumo, tik teigia, kad jei atliksim tiksliai – gausim tiksliai).
4. **Prietaisai ir priemonės (0,5/0,5 tšk.):** Visi išvardinti.
5. **Teorija ir formulės (3/3 tšk.):** Yra.
6. **Matavimai (3/3 tšk.):** Lentelė užpildyta.
7. **Skaičiavimai (2/3 tšk.):** Padaryta skaičiavimo klaida su masėmis (gautas pernelyg didelis svoris ir labai mažas koeficientas).
8. **Rezultatų užrašymas (1/1 tšk.):** Išrašyti po lentele.
9. **Išvada (1/3 tšk.):** Labai paviršutiniška, užsiminta tik apie išmatavimų netikslumą, visiškai neatsakyta į tikslą ir hipotezę.
10. **Refleksija (1/1 tšk.):** Pateikta.
* **Bendra taškų suma:** 13/17 tšk.
* **Galutinis pažymys:** 8
* **Patarimas:** Arvile, daugiau dėmesio skirk mokslinės hipotezės formulavimui ir skaičiavimams su tinkamais matavimo vienetais. Išvadoje atsakyk į visus 3 klausimus.$msg59$),
    ('fc768b3c-3114-4beb-8c51-fc385e490ed2'::uuid, $msg60$1. **Pavadinimas (0,5/0,5 tšk.):** Yra.
2. **Tikslas (1/1 tšk.):** Teisingas.
3. **Hipotezė (1/1 tšk.):** Teisinga ir logiška.
4. **Prietaisai ir priemonės (0,5/0,5 tšk.):** Visi išvardinti.
5. **Teorija ir formulės (3/3 tšk.):** Yra.
6. **Matavimai (0/3 tšk.):** Lentelės su matavimais išvis nėra.
7. **Skaičiavimai (0/3 tšk.):** Skaičiavimų nėra.
8. **Rezultatų užrašymas (0/1 tšk.):** Rezultatų nėra.
9. **Išvada (0/3 tšk.):** Išvados nėra.
10. **Refleksija (0/1 tšk.):** Refleksijos nėra.
* **Bendra taškų suma:** 6/17 tšk.
* **Galutinis pažymys:** 4
* **Patarimas:** Damir, atlikai tik teorinę pasiruošimo darbui dalį, tačiau visiškai nepateikei paties eksperimento duomenų ir jo rezultatų. Norint gauti teigiamą pažymį, būtina atlikti visą darbą.$msg60$),
    ('b899e0db-ddeb-4af7-ad6d-d2a2ef7872dd'::uuid, $msg61$1. **Pavadinimas (0,5/0,5 tšk.):** Parašytas.
2. **Tikslas (1/1 tšk.):** Teisingas.
3. **Hipotezė (1/1 tšk.):** Logiška.
4. **Prietaisai ir priemonės (0,5/0,5 tšk.):** Išvardinti visi 4.
5. **Teorija ir formulės (3/3 tšk.):** Yra.
6. **Matavimai (3/3 tšk.):** Lentelė pilnai užpildyta.
7. **Skaičiavimai (3/3 tšk.):** Atlikti teisingai.
8. **Rezultatų užrašymas (1/1 tšk.):** Išrašyti atskiroje skiltyje.
9. **Išvada (1/3 tšk.):** Tik patvirtinta hipotezė, bet pamiršta atsakyti į tikslą ir įvertinti paklaidas.
10. **Refleksija (1/1 tšk.):** Pateikta.
* **Bendra taškų suma:** 15/17 tšk.
* **Galutinis pažymys:** 9
* **Patarimas:** Mantai, išvada susideda iš kelių privalomų dalių, todėl vieno sakinio apie hipotezę nepakanka.$msg61$),
    ('71ea54d6-bede-433b-8db3-5238ef8a3e39'::uuid, $msg62$1. **Pavadinimas (0,5/0,5 tšk.):** Parašytas.
2. **Tikslas (1/1 tšk.):** Teisingas.
3. **Hipotezė (1/1 tšk.):** Logiška.
4. **Prietaisai ir priemonės (0,5/0,5 tšk.):** Yra visi 4.
5. **Teorija ir formulės (3/3 tšk.):** Yra.
6. **Matavimai (3/3 tšk.):** Lentelė užpildyta.
7. **Skaičiavimai (3/3 tšk.):** Skaičiavimai teisingi.
8. **Rezultatų užrašymas (1/1 tšk.):** Vertinant atlaidžiai – yra sukurta skiltis, kur matomi galutiniai rezultatai.
9. **Išvada (2/3 tšk.):** Atsakyta į hipotezę ir paklaidas, trūksta tiesioginio atsakymo į tikslą.
10. **Refleksija (1/1 tšk.):** Pateikta puiki refleksija.
* **Bendra taškų suma:** 16/17 tšk.
* **Galutinis pažymys:** 9
* **Patarimas:** Simona, kitą kartą išvadoje labai aiškiai parašyk: „Mano apskaičiuotas slydimo trinties koeficientas lygus...“.$msg62$),
    ('6a3de115-86bc-41d1-a642-1129a57ea75a'::uuid, $msg63$1. **Pavadinimas (0,5/0,5 tšk.):** Parašytas.
2. **Tikslas (1/1 tšk.):** Teisingas.
3. **Hipotezė (1/1 tšk.):** Logiška.
4. **Prietaisai ir priemonės (0,5/0,5 tšk.):** Išvardinta.
5. **Teorija ir formulės (3/3 tšk.):** Yra.
6. **Matavimai (2/3 tšk.):** Matavimai atlikti, tačiau lentelė nubraižyta ir užpildyta netvarkingai (sugrūsta į vieną langelį).
7. **Skaičiavimai (3/3 tšk.):** Atlikti teisingai.
8. **Rezultatų užrašymas (1/1 tšk.):** Išrašyti po lentele su paaiškinimais.
9. **Išvada (2/3 tšk.):** Patvirtinta hipotezė ir paminėtos paklaidos, trūksta aiškaus atsakymo į tikslą.
10. **Refleksija (1/1 tšk.):** Pateikta.
* **Bendra taškų suma:** 15/17 tšk.
* **Galutinis pažymys:** 9
* **Patarimas:** Urte, lenteles braižyk kuo tvarkingiau, skirdama atskirą eilutę kiekvienam bandymui – taip išvengsi painiavos.$msg63$),
    ('5a66788c-314c-40db-8141-9c34ffb08a53'::uuid, $msg64$1. **Pavadinimas (0,5/0,5 tšk.):** Parašytas.
2. **Tikslas (1/1 tšk.):** Teisingas.
3. **Hipotezė (1/1 tšk.):** Logiška.
4. **Prietaisai ir priemonės (0,5/0,5 tšk.):** Visi 4.
5. **Teorija ir formulės (3/3 tšk.):** Yra.
6. **Matavimai (2/3 tšk.):** Lentelėje trūksta 3-io žingsnio 3-io bandymo duomenų.
7. **Skaičiavimai (2/3 tšk.):** Dėl praleisto bandymo trūksta dalies skaičiavimų paskutinėje eilutėje.
8. **Rezultatų užrašymas (1/1 tšk.):** Rezultatai aiškiai išrašyti.
9. **Išvada (3/3 tšk.):** Puiki, apimanti visus 3 aspektus.
10. **Refleksija (1/1 tšk.):** Pateikta.
* **Bendra taškų suma:** 15/17 tšk.
* **Galutinis pažymys:** 9
* **Patarimas:** Patricija, būk atidesnė pildydama lenteles, kad nepaliktum tuščių, neužpildytų laukelių.$msg64$),
    ('1d3f0201-e7fa-4159-afcd-b5f3018f6b25'::uuid, $msg65$1. **Pavadinimas (0,5/0,5 tšk.):** Yra.
2. **Tikslas (1/1 tšk.):** Teisingas.
3. **Hipotezė (1/1 tšk.):** Logiška.
4. **Prietaisai ir priemonės (0,5/0,5 tšk.):** Visi 4.
5. **Teorija ir formulės (3/3 tšk.):** Yra visos reikalingos formulės.
6. **Matavimai (3/3 tšk.):** Lentelė pilnai užpildyta.
7. **Skaičiavimai (3/3 tšk.):** Atlikti labai detaliai ir teisingai.
8. **Rezultatų užrašymas (0/1 tšk.):** Galutiniai rezultatai paslėpti gausiame skaičiavimų tekste, neišrašyti atskira suvestine.
9. **Išvada (3/3 tšk.):** Aptartas tikslas, hipotezė ir paklaidos.
10. **Refleksija (1/1 tšk.):** Pateikta.
* **Bendra taškų suma:** 16/17 tšk.
* **Galutinis pažymys:** 9
* **Patarimas:** Mėta, tavo skaičiavimai labai išsamūs ir gražūs, tačiau kad būtų lengviau vertinti – visada padaryk mažą išrašą „Rezultatai“ su galutiniais skaičiais prieš pat išvadą.$msg65$),
    ('c8268820-3d8a-424c-b64f-b411239a9151'::uuid, $msg66$1. **Pavadinimas (0,5/0,5 tšk.):** Yra.
2. **Tikslas (1/1 tšk.):** Teisingas.
3. **Hipotezė (1/1 tšk.):** Logiška.
4. **Prietaisai ir priemonės (0,5/0,5 tšk.):** Visi 4 išvardinti.
5. **Teorija ir formulės (3/3 tšk.):** Yra.
6. **Matavimai (3/3 tšk.):** Lentelė pilnai užpildyta.
7. **Skaičiavimai (3/3 tšk.):** Atlikti teisingai.
8. **Rezultatų užrašymas (1/1 tšk.):** Aiškiai išrašyti po lentele.
9. **Išvada (2/3 tšk.):** Atsakyta į tikslą ir hipotezę, tačiau pamiršta aptarti matavimų paklaidas.
10. **Refleksija (1/1 tšk.):** Pateikta.
* **Bendra taškų suma:** 16/17 tšk.
* **Galutinis pažymys:** 9
* **Patarimas:** Urte, išvadoje būtinai palik nors vieną sakinį apie tai, kodėl atsirado paklaidos ir kaip jas galėtum sumažinti ateityje.$msg66$),
    ('638a0862-6326-452c-bc77-b332694e82c3'::uuid, $msg67$1. **Pavadinimas (0,5/0,5 tšk.):** Yra.
2. **Tikslas (1/1 tšk.):** Teisingas.
3. **Hipotezė (1/1 tšk.):** Logiška ir moksliška.
4. **Prietaisai ir priemonės (0,5/0,5 tšk.):** Visi 4.
5. **Teorija ir formulės (3/3 tšk.):** Yra.
6. **Matavimai (3/3 tšk.):** Lentelė pilnai užpildyta.
7. **Skaičiavimai (3/3 tšk.):** Viskas teisingai.
8. **Rezultatų užrašymas (1/1 tšk.):** Aiški skiltis „Rezultatai“.
9. **Išvada (2/3 tšk.):** Atsakyta į tikslą ir hipotezę, bet pamiršta aptarti paklaidas pačioje išvadoje (nors apie jas užsiminei refleksijoje).
10. **Refleksija (1/1 tšk.):** Puiki refleksija.
* **Bendra taškų suma:** 16/17 tšk.
* **Galutinis pažymys:** 9
* **Patarimas:** Emilija, mokslo darbuose visos priežastys ir paklaidos aptariamos oficialioje *išvadoje*, o ne *refleksijoje*.$msg67$),
    ('2d889424-293f-4eb7-93dc-fd01bb30fe9f'::uuid, $msg68$1. **Pavadinimas (0,5/0,5 tšk.):** Yra.
2. **Tikslas (1/1 tšk.):** Teisingas.
3. **Hipotezė (1/1 tšk.):** Logiška.
4. **Prietaisai ir priemonės (0/0,5 tšk.):** Visiškai neišvardinti prietaisai.
5. **Teorija ir formulės (0/3 tšk.):** Nėra pateikta nei teorija, nei jokios darbe naudotos formulės.
6. **Matavimai (3/3 tšk.):** Lentelė užpildyta.
7. **Skaičiavimai (3/3 tšk.):** Apskaičiuota teisingai.
8. **Rezultatų užrašymas (0/1 tšk.):** Rezultatai neišrašyti.
9. **Išvada (1/3 tšk.):** Atsakyta tik į hipotezę ir labai lakoniškai, be jokio pagrindimo.
10. **Refleksija (1/1 tšk.):** Pateikta.
* **Bendra taškų suma:** 10,5/17 tšk.
* **Galutinis pažymys:** 6
* **Patarimas:** Mykolai, praleidai labai didelę dalį privalomo teorinio pasiruošimo aprašo (teorija, formulės, prietaisai), o išvada yra per daug paviršutiniška.$msg68$),
    ('521c0bec-24de-471a-86e8-b0e611b2c721'::uuid, $msg69$1. **Pavadinimas (0,5/0,5 tšk.):** Yra.
2. **Tikslas (1/1 tšk.):** Teisingas.
3. **Hipotezė (1/1 tšk.):** Formuluotė kiek neįprasta, bet tinka kaip teiginys tikrinimui.
4. **Prietaisai ir priemonės (0,5/0,5 tšk.):** Yra visi 4.
5. **Teorija ir formulės (3/3 tšk.):** Yra reikiamos formulės.
6. **Matavimai (3/3 tšk.):** Lentelė užpildyta.
7. **Skaičiavimai (3/3 tšk.):** Skaičiavimai teisingi.
8. **Rezultatų užrašymas (0/1 tšk.):** Rezultatai nėra atskirai išrašyti.
9. **Išvada (1/3 tšk.):** Labai paviršutiniška („Viskas pagal tikslą išėjo“), neaptarta hipotezė ir paklaidos.
10. **Refleksija (1/1 tšk.):** Pateikta.
* **Bendra taškų suma:** 14/17 tšk.
* **Galutinis pažymys:** 8
* **Patarimas:** Vytautai, venk tokių abstrakčių išvadų. Turi aiškiai pasakyti skaičius, dėsnius ir aptarti matavimo problemas.$msg69$),
    ('48917098-57a0-4d05-a345-59c0cdd8fde5'::uuid, $msg70$1. **Pavadinimas (0,5/0,5 tšk.):** Yra.
2. **Tikslas (1/1 tšk.):** Teisingas.
3. **Hipotezė (1/1 tšk.):** Logiška.
4. **Prietaisai ir priemonės (0,5/0,5 tšk.):** Yra.
5. **Teorija ir formulės (3/3 tšk.):** Yra.
6. **Matavimai (3/3 tšk.):** Lentelė pilna.
7. **Skaičiavimai (3/3 tšk.):** Skaičiavimai tvarkingi.
8. **Rezultatų užrašymas (0/1 tšk.):** Neišrašyti atskirai.
9. **Išvada (1/3 tšk.):** Atsakyta tik į hipotezę, bet pamirštas tikslas ir paklaidos.
10. **Refleksija (1/1 tšk.):** Yra.
* **Bendra taškų suma:** 14/17 tšk.
* **Galutinis pažymys:** 8
* **Patarimas:** Gabija, rašydama išvadą pažiūrėk į darbo tikslą ir pirmiausia atsakyk į jį. Nepamiršk rezultatų santraukos.$msg70$),
    ('7604b698-c65c-4211-8a6d-017a49e13815'::uuid, $msg71$1. **Pavadinimas (0,5/0,5 tšk.):** Yra.
2. **Tikslas (1/1 tšk.):** Teisingas.
3. **Hipotezė (1/1 tšk.):** Išsami ir logiška.
4. **Prietaisai ir priemonės (0,5/0,5 tšk.):** Yra.
5. **Teorija ir formulės (3/3 tšk.):** Yra.
6. **Matavimai (3/3 tšk.):** Lentelė užpildyta.
7. **Skaičiavimai (3/3 tšk.):** Suskaičiuota teisingai.
8. **Rezultatų užrašymas (1/1 tšk.):** Aiškiai išrašyta.
9. **Išvada (2/3 tšk.):** Atsakyta į tikslą ir hipotezę, bet nepaminėtos paklaidos.
10. **Refleksija (1/1 tšk.):** Yra.
* **Bendra taškų suma:** 16/17 tšk.
* **Galutinis pažymys:** 9
* **Patarimas:** Erikai, tavo išvados visada turi apimti ir matavimų tikslumo ar paklaidų analizę, net jei darbas pavyko puikiai.$msg71$),
    ('36a43395-42bd-47b6-bf7a-57b49d9d81da'::uuid, $msg72$1. **Pavadinimas (0,5/0,5 tšk.):** Yra.
2. **Tikslas (1/1 tšk.):** Teisingas.
3. **Hipotezė (1/1 tšk.):** Puikiai suformuluota.
4. **Prietaisai ir priemonės (0,5/0,5 tšk.):** Yra.
5. **Teorija ir formulės (3/3 tšk.):** Yra.
6. **Matavimai (3/3 tšk.):** Lentelė užpildyta.
7. **Skaičiavimai (3/3 tšk.):** Apskaičiuota gerai.
8. **Rezultatų užrašymas (1/1 tšk.):** Suvestinė išrašyta atskirai.
9. **Išvada (2/3 tšk.):** Atsakyta į tikslą ir hipotezę, trūksta paklaidų įvertinimo išvadoje.
10. **Refleksija (1/1 tšk.):** Puiki refleksija.
* **Bendra taškų suma:** 16/17 tšk.
* **Galutinis pažymys:** 9
* **Patarimas:** Judre, kaip ir daugeliui kitų – išvados gale būtinai palik bent trumpą komentarą apie eksperimento paklaidas.$msg72$),
    ('9f215b83-3b6f-497f-af90-3c6afcc83a38'::uuid, $msg73$1. **Pavadinimas (0,5/0,5 tšk.):** Yra.
2. **Tikslas (1/1 tšk.):** Teisingas.
3. **Hipotezė (1/1 tšk.):** Surasta pačiame darbo gale ir ji teisinga.
4. **Prietaisai ir priemonės (0,5/0,5 tšk.):** Yra.
5. **Teorija ir formulės (3/3 tšk.):** Pateikta.
6. **Matavimai (3/3 tšk.):** Lentelė pilna.
7. **Skaičiavimai (3/3 tšk.):** Suskaičiuota teisingai.
8. **Rezultatų užrašymas (1/1 tšk.):** Aiški skiltis.
9. **Išvada (1/3 tšk.):** Atsakyta tik į tikslą, bet nepaminėta hipotezė ir paklaidos.
10. **Refleksija (1/1 tšk.):** Yra.
* **Bendra taškų suma:** 15/17 tšk.
* **Galutinis pažymys:** 9
* **Patarimas:** Auguste, jei keliame hipotezę, išvadoje visada privalome parašyti, ar ji pasitvirtino, ar ne.$msg73$),
    ('0763ac5c-f4bb-4047-bd07-995e4bc14d0b'::uuid, $msg74$1. **Pavadinimas (0,5/0,5 tšk.):** Yra.
2. **Tikslas (1/1 tšk.):** Teisingas.
3. **Hipotezė (1/1 tšk.):** Logiška ir moksliška.
4. **Prietaisai ir priemonės (0,5/0,5 tšk.):** Yra.
5. **Teorija ir formulės (1/3 tšk.):** Nėra teorijos teksto, išrašytos tik trumpos nebaigtos formulių nuotrupos be išsamesnio paaiškinimo.
6. **Matavimai (3/3 tšk.):** Lentelė užpildyta.
7. **Skaičiavimai (3/3 tšk.):** Skaičiavimai atlikti teisingai.
8. **Rezultatų užrašymas (1/1 tšk.):** Aiški rezultatų skiltis.
9. **Išvada (2/3 tšk.):** Atsakyta į tikslą ir hipotezę, nėra paklaidų.
10. **Refleksija (1/1 tšk.):** Yra.
* **Bendra taškų suma:** 14/17 tšk.
* **Galutinis pažymys:** 8
* **Patarimas:** Gintare, prieš atliekant darbą būtinai susirašyk ir susipažink su visomis reikalingomis formulėmis, kurias naudosi skaičiuojant.$msg74$),
    ('566f6139-fee0-40c5-93df-a2d103ad5e91'::uuid, $msg75$1. **Pavadinimas (0,5/0,5 tšk.):** Yra.
2. **Tikslas (1/1 tšk.):** Teisingas.
3. **Hipotezė (1/1 tšk.):** Logiška.
4. **Prietaisai ir priemonės (0,5/0,5 tšk.):** Visi 4.
5. **Teorija ir formulės (3/3 tšk.):** Pateikta.
6. **Matavimai (3/3 tšk.):** Lentelė užpildyta.
7. **Skaičiavimai (3/3 tšk.):** Apskaičiuota tvarkingai.
8. **Rezultatų užrašymas (0/1 tšk.):** Neišrašyti atskirai.
9. **Išvada (1/3 tšk.):** Atsakyta tik į hipotezę, pamirštas tikslas ir paklaidos.
10. **Refleksija (1/1 tšk.):** Yra.
* **Bendra taškų suma:** 14/17 tšk.
* **Galutinis pažymys:** 8
* **Patarimas:** Mingaile, išvada nėra pilnaverčio darbo pabaiga, jeigu joje išvengta atsakymo į pagrindinį darbo tikslą ir neaptarta matavimų kokybė.$msg75$),
    ('f3f7a51a-b7b9-4eb9-bb3a-fa6deff057ba'::uuid, $msg76$1. **Pavadinimas (0 tšk iš 0,5):** Tikslaus pavadinimo nėra, parašyta tik „Laboratorinis“.
2. **Tikslas (1 tšk iš 1):** Tikslas suformuluotas visiškai tiksliai.
3. **Hipotezė (1 tšk iš 1):** Hipotezė logiška, testuojama („kuo didesnis svoris tuo slydimas bus mažesnis“).
4. **Priemonės (0,5 tšk iš 0,5):** Visi 4 prietaisai išvardinti.
5. **Teorija ir formulės (1 tšk iš 3):** Trūksta pagrindinės teorijos dalies ir formulių $F_{tr} = \mu N$ ir $N = P$. Parašyta tik galutinė koeficiento išraiška skaičiavimuose.
6. **Matavimai (3 tšk iš 3):** Lentelė yra, atlikti 3 žingsniai po 3 bandymus.
7. **Skaičiavimai (2 tšk iš 3):** Lentelė užpildyta, tačiau yra akivaizdžių fizikos/skaičiavimo klaidų (pvz., skaičiuojant bendrą svorį $P$, dauginama neaišku iš ko: $10 \cdot 0,9 = 9,8$).
8. **Rezultatų užrašymas (1 tšk iš 1):** Koeficientai užrašyti po lentele.
9. **Išvada (1 tšk iš 3):** Atsakyta, kad hipotezė nepasitvirtino (+1), tačiau nenurodyta jokia gauta koeficiento vertė (+0) ir neįvertintos paklaidos (+0).
10. **Refleksija (1 tšk iš 1):** Refleksija parašyta.
* **Bendra taškų suma:** 11,5 tšk.
* **Galutinis pažymys:** **7 (Pakankamai gerai)**
* *Patarimas:* Mingaile, atidžiau rašyk teorinę darbo dalį ir pasikartok, kaip teisingai skaičiuojamas kūno svoris ($P = mg$).$msg76$),
    ('4aa862da-6144-4dba-81bc-9d2f9e3444e4'::uuid, $msg77$1. **Pavadinimas (0,5 tšk iš 0,5):** Pavadinimas parašytas teisingai.
2. **Tikslas (1 tšk iš 1):** Suformuluotas tiksliai.
3. **Hipotezė (1 tšk iš 1):** Hipotezė logiška ir atitinka struktūrą.
4. **Priemonės (0,5 tšk iš 0,5):** Visi 4 prietaisai išvardinti.
5. **Teorija ir formulės (3 tšk iš 3):** Pateikta reikiama teorija ir visos 3 pagrindinės formulės.
6. **Matavimai (3 tšk iš 3):** Lentelėje atlikti 3 žingsniai po 3 bandymus.
7. **Skaičiavimai (2 tšk iš 3):** Dauguma rezultatų surašyti, bet yra matavimų/skaičiavimų nesklandumų (trinties jėga 10, 30... galbūt gramai sumaišyti su niutonais) bei nebaigtos skaičiuoti paklaidos (palikti tritaškiai).
8. **Rezultatų užrašymas (1 tšk iš 1):** Rezultatai aiškiai atskirti po lentele.
9. **Išvada (1 tšk iš 3):** Patvirtinta hipotezė (+1), bet nenurodytas konkretus koeficientas (+0) ir neaptartos paklaidos (+0).
10. **Refleksija (1 tšk iš 1):** Yra.
* **Bendra taškų suma:** 14 tšk.
* **Galutinis pažymys:** **8 (Gerai)**
* *Patarimas:* Elze, nepamiršk pabaigti skaičiuoti visų lentelės skilčių (paklaidų) ir atkreipk dėmesį į jėgos matavimo vienetus (niutonus, o ne gramus).$msg77$),
    ('faaa0403-0566-4734-9583-d14da8ac8980'::uuid, $msg78$1. **Pavadinimas (0 tšk iš 0,5):** Tikslaus darbo pavadinimo nėra (tik „Darbo tikslas“).
2. **Tikslas (1 tšk iš 1):** Suformuluotas puikiai.
3. **Hipotezė (1 tšk iš 1):** Puikiai iškelta hipotezė.
4. **Priemonės (0,5 tšk iš 0,5):** Išvardintos visos 4.
5. **Teorija ir formulės (3 tšk iš 3):** Aprašyta pilnai, yra visos formulės.
6. **Matavimai (3 tšk iš 3):** Lentelė su 3 žingsniais po 3 bandymus.
7. **Skaičiavimai (1 tšk iš 3):** Labai skurdu. Visiškai nėra santykinės paklaidos skilties, nesimato normaliai apskaičiuoto bendro svorio ir koeficiento pačioje lentelėje (tik neaiškūs papildomi stulpeliai).
8. **Rezultatų užrašymas (0 tšk iš 1):** Gauti rezultatai (koeficientai) niekur atskirai neišrašyti.
9. **Išvada (1 tšk iš 3):** Atsakyta į hipotezę (+1), tačiau nėra konkrečių gautų skaičių ir paklaidų aptarimo.
10. **Refleksija (1 tšk iš 1):** Parašyta.
* **Bendra taškų suma:** 11,5 tšk.
* **Galutinis pažymys:** **7 (Pakankamai gerai)**
* *Patarimas:* Tomai, lentelėje privalo būti apskaičiuoti visi prašomi dydžiai (bendras svoris, paklaida, koeficientas). Taip pat išvadoje visada nurodyk konkretų gautą atsakymą (skaičių).$msg78$),
    ('7382677b-9528-4360-b06c-fe9e11029d78'::uuid, $msg79$1. **Pavadinimas (0,5 tšk iš 0,5):** Yra, tikslus.
2. **Tikslas (1 tšk iš 1):** Yra, tikslus.
3. **Hipotezė (1 tšk iš 1):** Išsami, puiki hipotezė.
4. **Priemonės (0,5 tšk iš 0,5):** Yra visos 4.
5. **Teorija ir formulės (3 tšk iš 3):** Aprašyta pilnai.
6. **Matavimai (3 tšk iš 3):** Lentelėje 3 žingsniai, 3 bandymai.
7. **Skaičiavimai (3 tšk iš 3):** Viskas suskaičiute teisingai, lentelė pilna.
8. **Rezultatų užrašymas (1 tšk iš 1):** Labai tvarkingai išrašyta skyrelyje „Rezultatų užrašymas“.
9. **Išvada (3 tšk iš 3):** Atsakyta į tikslą (+1), patvirtinta hipotezė (+1), įvertinta paklaidų atsiradimo priežastis (+1).
10. **Refleksija (1 tšk iš 1):** Yra.
* **Bendra taškų suma:** 17 tšk.
* **Galutinis pažymys:** **10 (Puikiai)**
* *Patarimas:* Jogaile, puikus, etaloninis darbas. Tęsk taip ir toliau.$msg79$),
    ('b8cf57f2-37dc-4971-ada2-17259d99d2c2'::uuid, $msg80$1. **Pavadinimas (0,5 tšk iš 0,5):** Yra.
2. **Tikslas (1 tšk iš 1):** Yra, tikslus.
3. **Hipotezė (0,5 tšk iš 1):** Labai netiksli, trūksta mokslinės logikos („bus aukštas“).
4. **Priemonės (0,5 tšk iš 0,5):** Yra.
5. **Teorija ir formulės (0 tšk iš 3):** Šios dalies visiškai nėra.
6. **Matavimai (3 tšk iš 3):** Atlikti 3 žingsniai po 3 bandymus.
7. **Skaičiavimai (1 tšk iš 3):** Lentelėje trūksta bendro svorio ir koeficiento skilčių, paklaidos skaičiavimas 100% atrodo klaidingas ir nebaigtas.
8. **Rezultatų užrašymas (0 tšk iš 1):** Nėra.
9. **Išvada (0 tšk iš 3):** Nėra išvados.
10. **Refleksija (0 tšk iš 1):** Nėra refleksijos.
* **Bendra taškų suma:** 6,5 tšk.
* **Galutinis pažymys:** **4 (Nepatenkinamai - slenkstinis)**
* *Patarimas:* Goda, darbą būtina atlikti iki galo. Reikia aprašyti teoriją, užpildyti visą lentelę ir būtinai parašyti išvadą.$msg80$),
    ('a0dfe301-07c7-4299-82a8-68c28e8467ed'::uuid, $msg81$1. **Pavadinimas (0 tšk iš 0,5):** Pavadinimas netikslus (tik „Laboratorinis darbas“).
2. **Tikslas (1 tšk iš 1):** Yra.
3. **Hipotezė (1 tšk iš 1):** Logiška ir aiški.
4. **Priemonės (0,5 tšk iš 0,5):** Yra.
5. **Teorija ir formulės (3 tšk iš 3):** Pilnai aprašyta.
6. **Matavimai (3 tšk iš 3):** Atlikta.
7. **Skaičiavimai (2 tšk iš 3):** Lentelė pilna, tačiau skaičiavimuose didelės loginės klaidos nuskaitytiems vienetams (koeficientas $\mu = 22,9$ neįmanomas). 
8. **Rezultatų užrašymas (0 tšk iš 1):** Rezultatai atskirai neužrašyti.
9. **Išvada (1 tšk iš 3):** Atsakyta į hipotezę (+1), bet nėra skaičiaus ir neaptartos paklaidos.
10. **Refleksija (1 tšk iš 1):** Yra.
* **Bendra taškų suma:** 12,5 tšk.
* **Galutinis pažymys:** **7 (Pakankamai gerai)**
* *Patarimas:* Mėta, išvadoje visuomet pateik darbo tikslo atsakymą (koks tas koeficientas?). Taip pat atkreipk dėmesį į matavimo prietaiso vienetus.$msg81$),
    ('49c29af1-1098-4158-902c-ee1752bb453d'::uuid, $msg82$1. **Pavadinimas (0,5 tšk iš 0,5):** Yra.
2. **Tikslas (1 tšk iš 1):** Yra.
3. **Hipotezė (1 tšk iš 1):** Yra, logiška.
4. **Priemonės (0,5 tšk iš 0,5):** Yra.
5. **Teorija ir formulės (3 tšk iš 3):** Aprašyta pilnai.
6. **Matavimai (3 tšk iš 3):** Atlikta.
7. **Skaičiavimai (3 tšk iš 3):** Lentelė užpildyta tvarkingai, reikšmės logiškos.
8. **Rezultatų užrašymas (0 tšk iš 1):** Koeficientai aiškiai neužrašyti atskirai nuo lentelės.
9. **Išvada (1 tšk iš 3):** Patvirtinta hipotezė (+1), bet trūksta konkrečios $\mu$ reikšmės įvardijimo ir paklaidų aptarimo.
10. **Refleksija (1 tšk iš 1):** Yra.
* **Bendra taškų suma:** 14 tšk.
* **Galutinis pažymys:** **8 (Gerai)**
* *Patarimas:* Juna, išvada turi būti išsami – tai viso darbo apibendrinimas. Nepamiršk į ją įtraukti gauto skaitinio rezultato.$msg82$),
    ('24a7a76c-4245-466a-a1b7-d88e98a15816'::uuid, $msg83$1. **Pavadinimas (0 tšk iš 0,5):** Nėra.
2. **Tikslas (0 tšk iš 1):** Nėra.
3. **Hipotezė (1 tšk iš 1):** Pateikta darbo pabaigoje, atitinka esmę.
4. **Priemonės (0 tšk iš 0,5):** Neištikrintos.
5. **Teorija ir formulės (1 tšk iš 3):** Nėra teorijos skyrelio, skaičiavimuose panaudota tik viena formulė $\mu = F_{tr}/P$.
6. **Matavimai (3 tšk iš 3):** Lentelėje yra matavimai.
7. **Skaičiavimai (3 tšk iš 3):** Visi skaičiavimai (nors ir išbarstyti per puslapius) atlikti.
8. **Rezultatų užrašymas (1 tšk iš 1):** Surašyta po lentele/skaičiavimuose.
9. **Išvada (1 tšk iš 3):** Paminėta hipotezės esmė (+1), bet nėra skaitinio įvertinimo ir paklaidų analizės (nors paklaida minima, nepaaiškinta, kodėl ji atsirado).
10. **Refleksija (1 tšk iš 1):** Yra.
* **Bendra taškų suma:** 11 tšk.
* **Galutinis pažymys:** **6 (Patenkinamai)**
* *Patarimas:* Gabriele, laboratorinis darbas privalo turėti struktūrą – neužmiršk darbo pradžioje nurodyti pavadinimo, tikslo ir reikalingų priemonių.$msg83$),
    ('6223d5ea-58ba-41b1-a65b-2eece8d55dac'::uuid, $msg84$1. **Pavadinimas (0,5 tšk iš 0,5):** Yra.
2. **Tikslas (1 tšk iš 1):** Yra.
3. **Hipotezė (1 tšk iš 1):** Išsami ir teisinga.
4. **Priemonės (0,5 tšk iš 0,5):** Yra.
5. **Teorija ir formulės (0 tšk iš 3):** Teorijos ir formulių nėra.
6. **Matavimai (3 tšk iš 3):** Tiesioginiai matavimai atlikti.
7. **Skaičiavimai (1 tšk iš 3):** Lentelė visiškai tuščia ties bendru svoriu ir koeficientu, paklaidos skiltis sumaišyta.
8. **Rezultatų užrašymas (0 tšk iš 1):** Nėra.
9. **Išvada (0 tšk iš 3):** Nėra.
10. **Refleksija (0 tšk iš 1):** Nėra.
* **Bendra taškų suma:** 7 tšk.
* **Galutinis pažymys:** **4 (Nepatenkinamai - slenkstinis)**
* *Patarimas:* Diana, pradėjai darbą gerai, tačiau jo nebaigei. Privaloma atlikti skaičiavimus, suformuluoti išvadą ir įvertinti savo darbą (refleksija).$msg84$),
    ('6a598d0c-cdc0-4c16-a9a2-54e479718fcb'::uuid, $msg85$1. **Pavadinimas (0,5 tšk iš 0,5):** Yra (užrašytas pabaigoje).
2. **Tikslas (1 tšk iš 1):** Yra (užrašytas pabaigoje).
3. **Hipotezė (1 tšk iš 1):** Yra (užrašyta pabaigoje).
4. **Priemonės (0 tšk iš 0,5):** Nėra.
5. **Teorija ir formulės (0 tšk iš 3):** Nėra aprašyta.
6. **Matavimai (3 tšk iš 3):** Matavimai atlikti tvarkingai.
7. **Skaičiavimai (3 tšk iš 3):** Visi skaičiavimai surašyti.
8. **Rezultatų užrašymas (1 tšk iš 1):** Išrašyta skaičiavimuose.
9. **Išvada (1 tšk iš 3):** Aptarta hipotezė (+1), bet nėra skaičių ir paklaidų analizės.
10. **Refleksija (1 tšk iš 1):** Yra.
* **Bendra taškų suma:** 11,5 tšk.
* **Galutinis pažymys:** **7 (Pakankamai gerai)**
* *Patarimas:* Gintare, geriausia išlaikyti standartinę laboratorinio darbo formą: pavadinimą, tikslą ir hipotezę rašyti pradžioje, o ne pačiame gale. Nepamiršk teorijos.$msg85$),
    ('e09be279-67a8-46e0-a638-ccbd0bf53a13'::uuid, $msg86$1. **Pavadinimas (0 tšk iš 0,5):** Trūksta tikslaus pavadinimo.
2. **Tikslas (1 tšk iš 1):** Yra.
3. **Hipotezė (1 tšk iš 1):** Yra.
4. **Priemonės (0 tšk iš 0,5):** Nėra.
5. **Teorija ir formulės (3 tšk iš 3):** Visos 3 pagrindinės formulės yra.
6. **Matavimai (3 tšk iš 3):** Yra.
7. **Skaičiavimai (3 tšk iš 3):** Lentelė užpildyta.
8. **Rezultatų užrašymas (0 tšk iš 1):** Už lentelės rezultatų nėra.
9. **Išvada (1 tšk iš 3):** Tik patikrinta hipotezė (+1).
10. **Refleksija (0 tšk iš 1):** Nėra.
* **Bendra taškų suma:** 12 tšk.
* **Galutinis pažymys:** **7 (Pakankamai gerai)**
* *Patarimas:* Karoli, visada po išvadų apmąstyk, kaip tau sekėsi – parašyk bent trumpą refleksiją. Tai padeda mokytis iš savo klaidų.$msg86$),
    ('4d09f73a-1f88-498c-9ce6-10d09a959552'::uuid, $msg87$1. **Pavadinimas (0 tšk iš 0,5):** Nėra.
2. **Tikslas (0 tšk iš 1):** Nėra.
3. **Hipotezė (1 tšk iš 1):** Yra.
4. **Priemonės (0 tšk iš 0,5):** Nėra.
5. **Teorija ir formulės (3 tšk iš 3):** Viskas aprašyta pilnai.
6. **Matavimai (3 tšk iš 3):** Yra.
7. **Skaičiavimai (2 tšk iš 3):** Lentelėje trūksta paklaidų ($\varepsilon$) skilties.
8. **Rezultatų užrašymas (0 tšk iš 1):** Neužrašyta atskirai.
9. **Išvada (1 tšk iš 3):** Tik patvirtinta hipotezė (+1).
10. **Refleksija (1 tšk iš 1):** Yra.
* **Bendra taškų suma:** 11 tšk.
* **Galutinis pažymys:** **6 (Patenkinamai)**
* *Patarimas:* Simai, atidžiai perskaityk laboratorinio darbo nurodymus – praleidai pačią darbo pradžią (pavadinimą, tikslą, priemones).$msg87$),
    ('38fa6b86-d35c-4140-8176-cf539fc43a99'::uuid, $msg88$1. **Pavadinimas (0,5 tšk iš 0,5):** Yra.
2. **Tikslas (0 tšk iš 1):** Nėra.
3. **Hipotezė (1 tšk iš 1):** Yra.
4. **Priemonės (0 tšk iš 0,5):** Nėra.
5. **Teorija ir formulės (0 tšk iš 3):** Nėra.
6. **Matavimai (3 tšk iš 3):** Yra.
7. **Skaičiavimai (3 tšk iš 3):** Lentelė pilnai užpildyta.
8. **Rezultatų užrašymas (0 tšk iš 1):** Nėra.
9. **Išvada (1 tšk iš 3):** Tik patvirtinta hipotezė (+1).
10. **Refleksija (0 tšk iš 1):** Nėra.
* **Bendra taškų suma:** 8,5 tšk.
* **Galutinis pažymys:** **5 (Silpnai)**
* *Patarimas:* Karoli, tavo matavimai ir skaičiavimai geri, tačiau visiškai praleidai teorinę dalį, neįsivardijai darbo tikslo, neparašei išsamios išvados ir refleksijos.$msg88$),
    ('fd166ce3-540d-47f6-b860-544d7def059e'::uuid, $msg89$1. **Pavadinimas (0 tšk iš 0,5):** Nėra.
2. **Tikslas (0 tšk iš 1):** Nėra.
3. **Hipotezė (0 tšk iš 1):** Nėra.
4. **Priemonės (0 tšk iš 0,5):** Nėra.
5. **Teorija ir formulės (1 tšk iš 3):** Yra tik formulių liekanos ($\mu = F/P$).
6. **Matavimai (3 tšk iš 3):** Yra.
7. **Skaičiavimai (3 tšk iš 3):** Lentelė užpildyta.
8. **Rezultatų užrašymas (0 tšk iš 1):** Nėra.
9. **Išvada (0 tšk iš 3):** Nėra išvados.
10. **Refleksija (0 tšk iš 1):** Nėra.
* **Bendra taškų suma:** 7 tšk.
* **Galutinis pažymys:** **4 (Nepatenkinamai - slenkstinis)**
* *Patarimas:* Karoli, atlikai tik matematinę darbo dalį. Pilnavertis fizikos laboratorinis darbas turi turėti tekstines dalis: hipotezę, teoriją, išvadas.$msg89$),
    ('30562b08-3c71-485f-8200-8c66f1f51d5b'::uuid, $msg90$1. **Pavadinimas (0 tšk iš 0,5):** Tikslaus nėra.
2. **Tikslas (1 tšk iš 1):** Yra.
3. **Hipotezė (1 tšk iš 1):** Yra.
4. **Priemonės (0,5 tšk iš 0,5):** Yra.
5. **Teorija ir formulės (3 tšk iš 3):** Visos formulės yra.
6. **Matavimai (3 tšk iš 3):** Atlikta.
7. **Skaičiavimai (2 tšk iš 3):** Lentelė pilna, tačiau skaičiavimuose (kaip ir kelių kitų moksleivių) sumaišyti vienetai, gauti nerealūs koeficientai (22,9).
8. **Rezultatų užrašymas (1 tšk iš 1):** Aiškiai atskirta.
9. **Išvada (1 tšk iš 3):** Tik patvirtinta hipotezė (+1).
10. **Refleksija (1 tšk iš 1):** Yra.
* **Bendra taškų suma:** 13,5 tšk.
* **Galutinis pažymys:** **8 (Gerai)**
* *Patarimas:* Guste, išvada – svarbiausia vieta parodyti, ką apskaičiavai, todėl būtinai joje įvardink gautą koeficiento skaičių ir paaiškink matavimo netikslumus.$msg90$),
    ('3fad3ebb-31d4-49ea-8fd6-55e375c063ca'::uuid, $msg91$1. **Pavadinimas (0,5 tšk iš 0,5):** Yra.
2. **Tikslas (0 tšk iš 1):** Nėra.
3. **Hipotezė (1 tšk iš 1):** Yra.
4. **Priemonės (0,5 tšk iš 0,5):** Yra.
5. **Teorija ir formulės (3 tšk iš 3):** Aprašyta trumpai, bet visos 3 formulės vietoje.
6. **Matavimai (3 tšk iš 3):** Yra.
7. **Skaičiavimai (3 tšk iš 3):** Lentelė puikiai užpildyta.
8. **Rezultatų užrašymas (0 tšk iš 1):** Neužrašyta atskirai.
9. **Išvada (1 tšk iš 3):** Patvirtinta hipotezė (+1). Nėra reikšmės ir paklaidų aptarimo.
10. **Refleksija (0 tšk iš 1):** Nėra.
* **Bendra taškų suma:** 12 tšk.
* **Galutinis pažymys:** **7 (Pakankamai gerai)**
* *Patarimas:* Dominykai, lentelę užpildei puikiai, tačiau pamiršai užbaigti darbą išsamia išvada bei refleksija.$msg91$),
    ('5b320a72-c54e-490b-9294-f54fba789711'::uuid, $msg92$1. **Pavadinimas (0,5 tšk iš 0,5):** Yra.
2. **Tikslas (1 tšk iš 1):** Yra.
3. **Hipotezė (1 tšk iš 1):** Yra.
4. **Priemonės (0,5 tšk iš 0,5):** Yra.
5. **Teorija ir formulės (3 tšk iš 3):** Tobulai aprašyta.
6. **Matavimai (3 tšk iš 3):** Yra.
7. **Skaičiavimai (3 tšk iš 3):** Viskas atlikta labai tiksliai.
8. **Rezultatų užrašymas (1 tšk iš 1):** Išrašyta tvarkingai.
9. **Išvada (3 tšk iš 3):** Išsami: pateiktas koeficientas (+1), patvirtinta hipotezė (+1), įvertinta paklaida (+1).
10. **Refleksija (1 tšk iš 1):** Yra.
* **Bendra taškų suma:** 17 tšk.
* **Galutinis pažymys:** **10 (Puikiai)**
* *Patarimas:* Rugile, darbas atliktas idealiai, atsižvelgta į visas smulkmenas. Puikus rezultatas.$msg92$),
    ('53701187-c703-43d8-8d5e-75cc050caee6'::uuid, $msg93$1. **Pavadinimas (0,5 tšk iš 0,5):** Yra.
2. **Tikslas (1 tšk iš 1):** Yra.
3. **Hipotezė (1 tšk iš 1):** Yra.
4. **Priemonės (0,5 tšk iš 0,5):** Yra.
5. **Teorija ir formulės (3 tšk iš 3):** Pilnai aprašyta.
6. **Matavimai (3 tšk iš 3):** Yra.
7. **Skaičiavimai (3 tšk iš 3):** Lentelė pilna ir rezultatai atrodo tvarkingi.
8. **Rezultatų užrašymas (1 tšk iš 1):** Išrašyta po skaičiavimais.
9. **Išvada (1 tšk iš 3):** Išvadoje pateiktas tik tendencijos konstatavimas ("kuo daugiau... tuo didesnis..."), kas veikia kaip dalinis atsakas į tikslą, bet neaptartos paklaidos ir neįvardinta konkreti $\mu$ vertė.
10. **Refleksija (0 tšk iš 1):** Nėra.
* **Bendra taškų suma:** 14 tšk.
* **Galutinis pažymys:** **8 (Gerai)**
* *Patarimas:* Matai, pasistenk išvadoje atsakyti kuo konkrečiau (skaičiais) ir būtinai parašyk, kaip tau sekėsi darbas (refleksiją).$msg93$),
    ('293423bf-5e3c-4fe9-aa17-66f8f082de6b'::uuid, $msg94$1. **Pavadinimas (0,5 tšk iš 0,5):** Yra.
2. **Tikslas (1 tšk iš 1):** Yra.
3. **Hipotezė (1 tšk iš 1):** Yra.
4. **Priemonės (0,5 tšk iš 0,5):** Yra.
5. **Teorija ir formulės (3 tšk iš 3):** Viskas yra.
6. **Matavimai (3 tšk iš 3):** Yra.
7. **Skaičiavimai (3 tšk iš 3):** Atlikti visi skaičiavimai.
8. **Rezultatų užrašymas (1 tšk iš 1):** Aiškiai parašyta išvadoje.
9. **Išvada (3 tšk iš 3):** Patikrinta hipotezė (+1), pateiktos koeficiento vertės (+1), aptartas skirtingas tempimo greitis kaip paklaidų priežastis (+1).
10. **Refleksija (1 tšk iš 1):** Išsami refleksija.
* **Bendra taškų suma:** 17 tšk.
* **Galutinis pažymys:** **10 (Puikiai)**
* *Patarimas:* Greta, nepriekaištingas, tvarkingas ir nuoseklus darbas. Puikiai įvertinti netikslumų šaltiniai išvadoje.$msg94$),
    ('f2001d0d-a82a-4ea9-b512-f3a48aedea38'::uuid, $msg95$1. **Pavadinimas (0,5 tšk iš 0,5):** Yra.
2. **Tikslas (1 tšk iš 1):** Yra.
3. **Hipotezė (1 tšk iš 1):** Yra.
4. **Priemonės (0,5 tšk iš 0,5):** Yra.
5. **Teorija ir formulės (3 tšk iš 3):** Yra viskas, ko prašoma.
6. **Matavimai (3 tšk iš 3):** Yra.
7. **Skaičiavimai (3 tšk iš 3):** Viskas puikiai ir tiksliai apskaičiuota.
8. **Rezultatų užrašymas (1 tšk iš 1):** Aiškiai pateikta tekste.
9. **Išvada (3 tšk iš 3):** Visi 3 išvados elementai (tikslas/skaičius, hipotezė, paklaidos) atsakyti puikiai.
10. **Refleksija (1 tšk iš 1):** Yra.
* **Bendra taškų suma:** 17 tšk.
* **Galutinis pažymys:** **10 (Puikiai)**
* *Patarimas:* Ryte, puikus darbas, atliktas pagal visus reikalavimus.$msg95$),
    ('5957b2ae-24f3-42e7-92ea-90ad7c0494b8'::uuid, $msg96$1. **Pavadinimas (0,5 tšk iš 0,5):** Yra.
2. **Tikslas (1 tšk iš 1):** Yra.
3. **Hipotezė (1 tšk iš 1):** Yra (nors ir ne visai standartinė).
4. **Priemonės (0,5 tšk iš 0,5):** Yra.
5. **Teorija ir formulės (3 tšk iš 3):** Visi elementai surašyti.
6. **Matavimai (3 tšk iš 3):** Yra.
7. **Skaičiavimai (3 tšk iš 3):** Lentelė pilna ir tvarkinga.
8. **Rezultatų užrašymas (1 tšk iš 1):** Gražiai išrašyta po lentele.
9. **Išvada (1 tšk iš 3):** Pasidaryta tik bendra tendencijų išvada/hipotezės patikrinimas (+1). Trūksta galutinio skaičiaus suformulavimo bendroje išvadoje ir paklaidų analizės.
10. **Refleksija (1 tšk iš 1):** Yra.
* **Bendra taškų suma:** 15 tšk.
* **Galutinis pažymys:** **9 (Labai gerai)**
* *Patarimas:* Eimantai, geras darbas, tačiau atkreipk dėmesį į išvados formuluotę: joje neužtenka parašyti tik tendencijos, reikia aiškiai apibendrinti, koks buvo gautas koeficientas ir iš kur galėjo atsirasti paklaidos.$msg96$),
    ('98c083d2-0c90-4df3-8717-6df3fb27b3f2'::uuid, $msg97$**1. Vertinimas pagal punktus:**
*   1. Pavadinimas (0 tšk.): Nėra tikslaus pavadinimo.
*   2. Tikslas (1 tšk.): Suformuluotas visiškai tiksliai.
*   3. Hipotezė (1 tšk.): Logiška ir tikrinama („trintis priklauso nuo paviršiaus ploto“).
*   4. Prietaisai (0,5 tšk.): Išvardinti visi 4 reikalaujami.
*   5. Teorija (0 tšk.): Formulių $F_{tr}=\mu N$ ir kt. nėra, parašyta nesusijusi formulė.
*   6. Matavimai (3 tšk.): Lentelė nubraižyta, yra visi 3 žingsniai po 3 bandymus.
*   7. Skaičiavimai (2 tšk.): Apskaičiuoti visi dydžiai, tačiau yra loginių ir matematinių klaidų (pvz., masės vertimas į svorį P). Masę reikėjo pradžioje paversti iš gramų į kilogramus.
*   8. Rezultatų užrašymas (0 tšk.): Rezultatai atskirai neužrašyti.
*   9. Išvada (0 tšk.): Išvados nėra.
*   10. Refleksija (1 tšk.): Refleksija parašyta.

**2. Bendra taškų suma:** 8,5 / 17 tšk.

**3. Galutinis pažymys:** 5

**4. Patarimas:** Nedai, prieš skaičiavimus pasitikrink ar tinkami matavimo vienetai ir nepamiršk parašyti darbo išvados.$msg97$),
    ('e38cb95a-9687-46d8-b179-d08bed36d2e6'::uuid, $msg98$**1. Vertinimas pagal punktus:**
*   1. Pavadinimas (0 tšk.): Tikslaus pavadinimo nėra.
*   2. Tikslas (0 tšk.): Tikslo nėra.
*   3. Hipotezė (1 tšk.): Logiška ir tikrinama.
*   4. Prietaisai (0 tšk.): Neišvardinti.
*   5. Teorija (0 tšk.): Formulių nėra.
*   6. Matavimai (3 tšk.): Yra 3 žingsniai po 3 bandymus.
*   7. Skaičiavimai (3 tšk.): Yra.
*   8. Rezultatų užrašymas (0 tšk.): Atskirai neužrašyta.
*   9. Išvada (1 tšk.): Atsakyta tik į hipotezės dalį.
*   10. Refleksija (1 tšk.): Puiki, detali refleksija.

**2. Bendra taškų suma:** 9 / 17 tšk.

**3. Galutinis pažymys:** 5

**4. Patarimas:** Ernest, skaičiavimų prasme - tavo darbas vienas iš geriausių, nes teisingai apskaičiavai bendrą svorį ir slydimo trinties koeficientą. Gaila, kad praleidai kitus svarbius darbo elementus: tikslą, teorijos (formulių) aprašą ir prietaisų sąrašą. Be jų praradai daug taškų.$msg98$),
    ('d698a6e0-ee7c-4b24-b657-2e793941bf00'::uuid, $msg99$**1. Vertinimas pagal punktus:**
*   1. Pavadinimas (0,5 tšk.): Pavadinimas tikslus.
*   2. Tikslas (1 tšk.): Suformuluotas tiksliai.
*   3. Hipotezė (1 tšk.): Logiška.
*   4. Prietaisai (0,5 tšk.): Visi išvardinti.
*   5. Teorija (3 tšk.): Visos reikiamos formulės pateiktos.
*   6. Matavimai (3 tšk.): Lentelė pilnai užpildyta.
*   7. Skaičiavimai (2 tšk.): Apskaičiuoti visi stulpeliai, bet padarytos klaidos skaičiuojant bendrą svorį (reikėjo g pasiversti į kg).
*   8. Rezultatų užrašymas (1 tšk.): $\mu$ reikšmė užrašyta po lentele.
*   9. Išvada (1 tšk.): Patvirtinta tik hipotezė, neatsakyta į tikslą, neaptartos paklaidos.
*   10. Refleksija (1 tšk.): Refleksija parašyta.

**2. Bendra taškų suma:** 14 / 17 tšk.

**3. Galutinis pažymys:** 8

**4. Patarimas:** Rokai, būk atidus su matavimo vienetais. 100 gramų yra 0,1 kg, todėl svoris turėtų būti 0,98 N, o ne 981 N.$msg99$),
    ('b00618aa-e471-4211-94f4-e8461882686f'::uuid, $msg100$**1. Vertinimas pagal punktus:**
*   1. Pavadinimas (1 tšk.): yra.
*   2. Tikslas (1 tšk.): Tikslus.
*   3. Hipotezė (1 tšk.): Logiška ir atitinka struktūrą.
*   4. Prietaisai (0,5 tšk.): Yra.
*   5. Teorija (3 tšk.): Visos reikiamos formulės surašytos apačioje.
*   6. Matavimai (3 tšk.): Pilni matavimai atlikti.
*   7. Skaičiavimai (2 tšk.): Užpildyta, tačiau yra klaidų su skaičiavimais bendro svorio ir trinties koeficiento $\mu$.
*   8. Rezultatų užrašymas (0 tšk.): Nėra.
*   9. Išvada (1 tšk.): patvirtinta hipotezė (tikrovėje turėjo būti paneigti, jeigu nebūtų skaičiavimo klaidų), neatsakyta į tikslą ir neaptartos paklaidos.
*   10. Refleksija (1 tšk.): Parašyta.

**2. Bendra taškų suma:** 13,5 / 17 tšk.

**3. Galutinis pažymys:** 8

**4. Patarimas:** Modestai, atkreipk dėmesį į matavimo vienetus prieš atliekant skaičiavimus. Taip pat pasitikrink, ar naudoji tinkamas formules.$msg100$),
    ('1d982653-2f9f-42a2-92fe-aaf4e7a47932'::uuid, $msg101$**1. Vertinimas pagal punktus:**
*   1. Pavadinimas (0 tšk.): Tikslaus pavadinimo nėra.
*   2. Tikslas (1 tšk.): Tikslus.
*   3. Hipotezė (0 tšk.): Nepabaigtas sakinys („Jei“).
*   4. Prietaisai (0,5 tšk.): Visi išvardinti.
*   5. Teorija (3 tšk.): Formulės parašytos aiškiai.
*   6. Matavimai (3 tšk.): Matavimai atlikti 3 žingsniais.
*   7. Skaičiavimai (1 tšk.): Suskaičiuoti tik vidurkiai. P ir $\mu$ stulpeliai palikti tušti.
*   8. Rezultatų užrašymas (0 tšk.): Nėra.
*   9. Išvada (0 tšk.): Išvados visiškai nėra.
*   10. Refleksija (0 tšk.): Nėra.

**2. Bendra taškų suma:** 8,5 / 17 tšk.

**3. Galutinis pažymys:** 5

**4. Patarimas:** Silvia, gera darbo pradžia, tik kitą kartą atlik skaičiavimus ir būtinai parašyk išvadą. Be to, tavo labai tvarkingas raštas - man atrodo, kad esi puiki kaligrafė!$msg101$),
    ('b720c86c-5f6f-4771-bf22-e30c2aa9af02'::uuid, $msg102$**1. Vertinimas pagal punktus:**
*   1. Pavadinimas (0,5 tšk.): Pavadinimas tikslus.
*   2. Tikslas (1 tšk.): Tikslus.
*   3. Hipotezė (1 tšk.): Logiška ir susijusi su tema.
*   4. Prietaisai (0,5 tšk.): Išvardinti.
*   5. Teorija (3 tšk.): Aprašyta puikiai ir su visom formulėm.
*   6. Matavimai (3 tšk.): Lentelė pilna.
*   7. Skaičiavimai (2 tšk.): Viskas užpildyta, tačiau bendras svoris apskaičiuotas neteisingai (turėjo būti daug mažesnis). Gali būti, kad naudojai netinkamus matavimo vienetus.
*   8. Rezultatų užrašymas (0 tšk.): Atskirai už lentelės neužrašyta.
*   9. Išvada (1 tšk.): Patvirtinta hipotezė. Neatsakyta į darbo tikslą ir neaptartos paklaidos.
*   10. Refleksija (1 tšk.): yra.

**2. Bendra taškų suma:** 13 / 17 tšk.

**3. Galutinis pažymys:** 8

**4. Patarimas:** Augustai, tvarkingas darbas. Ateityje atidžiau atlikinėk skaičiavimus.$msg102$),
    ('a2f9feeb-38e8-4c28-8074-87bd25e41a91'::uuid, $msg103$**1. Vertinimas pagal punktus:**
*   1. Pavadinimas (0,5 tšk.): Yra.
*   2. Tikslas (1 tšk.): Yra.
*   3. Hipotezė (1 tšk.): Yra.
*   4. Prietaisai (0 tšk.): Neišvardinti.
*   5. Teorija (3 tšk.): Yra.
*   6. Matavimai (3 tšk.): Yra.
*   7. Skaičiavimai (2 tšk.): Bendras svoris ir trinties koeficientai apskaičiuoti klaidingai.
*   8. Rezultatų užrašymas (0 tšk.): Nėra.
*   9. Išvada (1 tšk.): Yra, atsakyta į hipotezę.
*   10. Refleksija (1 tšk.): Yra.

**2. Bendra taškų suma:** 12,5 / 17 tšk.

**3. Galutinis pažymys:** 7

**4. Patarimas:** Jokūbai, kitą kartą nepamiršk atskirai po lentele surašyti gautus rezultatus ir parašyti pilną išvadą, su atsakymu į darbo tikslą ir paklaidų aptarimu.$msg103$),
    ('53494c83-ce50-4fb5-8d4f-bc8ac33638b6'::uuid, $msg104$**1. Vertinimas pagal punktus:**
*   1. Pavadinimas (0 tšk.): Nėra tikslaus pavadinimo.
*   2. Tikslas (0 tšk.): Nėra.
*   3. Hipotezė (1 tšk.): Logiška.
*   4. Prietaisai (0 tšk.): Nėra.
*   5. Teorija (0 tšk.): Surašytos nereikalingos formulės (spyruoklės standumas ir pan.), bet ne slydimo trinties.
*   6. Matavimai (3 tšk.): Matavimai atlikti, 3 žingsniai.
*   7. Skaičiavimai (2 tšk.): Lentelė pilnai, tačiau bendras svoris apskaičiuotas neteisingai (turėjo gautis apie 10x mažesnis). Be to, slydimo trinties koeficientas matavimo vienetų neturi.
*   8. Rezultatų užrašymas (1 tšk.): Išrašyta reikšmė apačioje.
*   9. Išvada (1 tšk.): Tik patvirtinta hipotezė.
*   10. Refleksija (1 tšk.): Išsami.

**2. Bendra taškų suma:** 9 / 17 tšk.

**3. Galutinis pažymys:** 5

**4. Patarimas:** Martai, nepamiršk kitą kartą parašyti pradinės dalies – darbo tikslo ir prietaisų sąrašo bei atitinkamų teorijos formulių.$msg104$),
    ('0402b494-cf30-4daf-b704-c418c2b24de5'::uuid, $msg105$**1. Vertinimas pagal punktus:**
*   1. Pavadinimas (0,5 tšk.): Tikslus.
*   2. Tikslas (0 tšk.): Nėra.
*   3. Hipotezė (1 tšk.): Logiška struktūra. Nors pati hipotezė nėra moksliškai teisinga ir tavo atliktas eksperimentas turėjo ją paneigti.
*   4. Prietaisai (0 tšk.): Nėra.
*   5. Teorija (0 tšk.): Formulių nėra.
*   6. Matavimai (3 tšk.): Yra 3 žingsniai po 3 bandymus.
*   7. Skaičiavimai (2 tšk.): P apskaičiuoti, bet $\mu$ gavai žymiai didesnius negu turėjo būti - tikriausiai ne tą formulę taikei skaičiavimams. Kai kurios skiltys (paklaidos) neišsamios arba užpildytos klaidingai. Trūksta vidurkių tvarkos.
*   8. Rezultatų užrašymas (0 tšk.): Nėra.
*   9. Išvada (1 tšk.): Tik patvirtinta hipotezė (kuri tavo atveju turėjo būti paneigta, jei skaičiavimai būtų atlikti tinkamai)
*   10. Refleksija (1 tšk.): Yra.

**2. Bendra taškų suma:** 8,5 / 17 tšk.

**3. Galutinis pažymys:** 5

**4. Patarimas:** Jonai, prieš pradedant lentelę būtina parašyti darbo tikslą, reikalingas priemones ir formules. Aprašo struktūra turi būti nuosekli.$msg105$),
    ('33cf90d9-73bf-4a73-bf3a-00ff9c7f82ee'::uuid, $msg106$**1. Vertinimas pagal punktus:**
*   1. Pavadinimas (0,5 tšk.): Tikslus.
*   2. Tikslas (1 tšk.): Yra.
*   3. Hipotezė (0,5 tšk.): Suformuluota silpnai/sunkiai suprantamai („Jei svoriai skiriasi skirtingai su tašeliais...“).
*   4. Prietaisai (0,5 tšk.): Yra.
*   5. Teorija (3 tšk.): Reikalingos formulės pateiktos.
*   6. Matavimai (3 tšk.): Matavimai atlikti.
*   7. Skaičiavimai (1 tšk.): Suskaičiuoti tik vidurkiai, didelė lentelės dalis tuščia (nėra trinties koeficiento reikšmių).
*   8. Rezultatų užrašymas (0 tšk.): Nėra.
*   9. Išvada (0 tšk.): Nėra.
*   10. Refleksija (1 tšk.): Yra.

**2. Bendra taškų suma:** 10,5 / 17 tšk.

**3. Galutinis pažymys:** 6

**4. Patarimas:** Skaiste, reikėtų suskaičiuoti $\mu$ nes toks buvo darbo tikslas. Taip pat nepamiršk parašyti apibendrinančios išvados. Rekomenduočiau dar prieš laboratorinį darbą pasiskaityti darbo aprašą ir jeigu kiltų kokių nors neaiškumų galėtum iš anksto paklausti manęs ir aš mielai padėsiu :)$msg106$),
    ('67f182a9-06a9-4e2c-a2a2-c6c1d52e1816'::uuid, $msg107$**1. Vertinimas pagal punktus:**
*   1. Pavadinimas (0,5 tšk.): Tikslus.
*   2. Tikslas (1 tšk.): Yra.
*   3. Hipotezė (0 tšk.): Palikta tuščia (nurašyta tik taisyklė, kaip rašyti hipotezę).
*   4. Prietaisai (0 tšk.): Neišvardinti.
*   5. Teorija (0 tšk.): Nėra.
*   6. Matavimai (3 tšk.): Tiesioginiai matavimai (F_tr) atlikti.
*   7. Skaičiavimai (1 tšk.): Suskaičiuotas tik vidurkis. Skaičiavimo stulpeliai (P, $\mu$) tušti.
*   8. Rezultatų užrašymas (0 tšk.): Nėra.
*   9. Išvada (0 tšk.): Nėra.
*   10. Refleksija (0 tšk.): Nėra.

**2. Bendra taškų suma:** 5,5 / 17 tšk.

**3. Galutinis pažymys:** 3

**4. Patarimas:** Metlovaite, rekomenduočiau dar prieš laboratorinį darbą pasiskaityti darbo aprašą ir jeigu kiltų kokių nors neaiškumų galėtum iš anksto paklausti manęs ir aš mielai padėsiu :)$msg107$),
    ('f58f572e-675b-4404-9356-6af95b1e27d0'::uuid, $msg108$**1. Vertinimas pagal punktus:**
*   1. Pavadinimas (0,5 tšk.): Tikslus.
*   2. Tikslas (1 tšk.): Yra.
*   3. Hipotezė (1 tšk.): Yra.
*   4. Prietaisai (0,5 tšk.): Yra.
*   5. Teorija (3 tšk.): Yra visos reikiamos formulės.
*   6. Matavimai (3 tšk.): Pilni matavimai atlikti.
*   7. Skaičiavimai (2 tšk.): Lentelė beveik užpildyta (apskaičiuoti svoriai P ir paklaidos), bet neapskaičiuotas pats svarbiausias dydis – trinties koeficientas $\mu$.
*   8. Rezultatų užrašymas (0 tšk.): Nėra.
*   9. Išvada (1 tšk.): Atsakyta į hipotezę („pasitvirtino“).
*   10. Refleksija (1 tšk.): Yra.

**2. Bendra taškų suma:** 13 / 17 tšk.

**3. Galutinis pažymys:** 8

**4. Patarimas:** Greta, darbas labai neblogas, bet pamiršai suskaičiuoti tai, ko reikalavo darbo tikslas – slydimo trinties koeficientą $\mu$ (padalinti jėgą iš svorio).$msg108$),
    ('be5ac3ae-0fb1-44fc-9097-da23412af611'::uuid, $msg109$**1. Vertinimas pagal punktus:**
*   1. Pavadinimas (0 tšk.): Nėra.
*   2. Tikslas (1 tšk.): Yra.
*   3. Hipotezė (1 tšk.): Yra.
*   4. Prietaisai (0,5 tšk.): Yra.
*   5. Teorija (1 tšk.): Pateikta tik viena formulė iš reikiamų trijų.
*   6. Matavimai (3 tšk.): Matavimai atlikti.
*   7. Skaičiavimai (2 tšk.): Apskaičiuota pakankamai dydžių, bet lentelės struktūra labai padrika ir sumaišyta.
*   8. Rezultatų užrašymas (0 tšk.): Nėra.
*   9. Išvada (0 tšk.): Nėra.
*   10. Refleksija (0 tšk.): Nėra.

**2. Bendra taškų suma:** 8,5 / 17 tšk.

**3. Galutinis pažymys:** 5

**4. Patarimas:** Kristupai, atlikus skaičiavimus visada reikia pateikti apibendrinančią išvadą, kurioje atsakytum, ar tavo iškelta hipotezė pasitvirtino.$msg109$),
    ('b268157b-b470-416c-8f2f-73963e29bbdd'::uuid, $msg110$**1. Vertinimas pagal punktus:**
*   1. Pavadinimas (0 tšk.): Netikslus pavadinimas.
*   2. Tikslas (0 tšk.): Nėra.
*   3. Hipotezė (1 tšk.): Yra, formuluotė tinkama.
*   4. Prietaisai (0 tšk.): Nėra.
*   5. Teorija (0 tšk.): Nėra aprašytos trinties teorijos ar formulių.
*   6. Matavimai (3 tšk.): Matavimai atlikti 3 žingsniais.
*   7. Skaičiavimai (2 tšk.): Skaičiavimai lentelėje atlikti, trinties koeficientas apskaičiuotas (neteisingai), trūksta kai kurių svorio (P) duomenų.
*   8. Rezultatų užrašymas (0 tšk.): Nėra.
*   9. Išvada (1 tšk.): Tik patvirtinta hipotezė.
*   10. Refleksija (1 tšk.): Yra.

**2. Bendra taškų suma:** 8 / 17 tšk.

**3. Galutinis pažymys:** 5

**4. Patarimas:** Aleksej, darbe labai trūksta struktūros: tikslo formuluotės, reikalingų prietaisų ir darbo teorijos su formulėmis.$msg110$),
    ('ff834348-8c6f-41df-8b5d-88fdfec213f4'::uuid, $msg111$**1. Vertinimas pagal punktus:**
*   1. Pavadinimas (0 tšk.): Nėra aiškaus pavadinimo.
*   2. Tikslas (1 tšk.): Yra.
*   3. Hipotezė (1 tšk.): Yra.
*   4. Prietaisai (0,5 tšk.): Yra.
*   5. Teorija (2 tšk.): Pateiktos 2 pagrindinės formulės iš 3 reikalaujamų.
*   6. Matavimai (3 tšk.): Viskas atlikta gražiai.
*   7. Skaičiavimai (2 tšk.): Trinties koeficientas apskaičiuotas neteisingai - tikriausiai naudojai ne tą formulę. Visuose bandymuose trinties koeficientas turėjo išlikti daugmaž pastovus.
*   8. Rezultatų užrašymas (0 tšk.): Nėra.
*   9. Išvada (0 tšk.): Išvados nėra visiškai.
*   10. Refleksija (0 tšk.): Nėra.

**2. Bendra taškų suma:** 9,5 / 17 tšk.

**3. Galutinis pažymys:** 6

**4. Patarimas:** Karoli, tavo skaičiavimai ir matavimai labai tvarkingi, tačiau trūksta išvados, refleksijos.$msg111$),
    ('174dcbdd-601c-40db-8d33-a5bc0054a6d9'::uuid, $msg112$**1. Vertinimas pagal punktus:**
*   1. Pavadinimas (0,5 tšk.): Tikslus (nors ir sutrumpintas).
*   2. Tikslas (0 tšk.): Nėra.
*   3. Hipotezė (1 tšk.): Yra.
*   4. Prietaisai (0 tšk.): Nėra.
*   5. Teorija (0 tšk.): Nėra.
*   6. Matavimai (3 tšk.): Matavimai atlikti.
*   7. Skaičiavimai (2 tšk.): Trinties koeficientas apskaičiuotas neteisingai - tikriausiai naudojai ne tą formulę. Visuose bandymuose trinties koeficientas turėjo išlikti daugmaž pastovus.
*   8. Rezultatų užrašymas (0 tšk.): Nėra.
*   9. Išvada (1 tšk.): Atsakyta į hipotezę. Paklaidos neįvertintos, neatsakyta į tikslą aiškiai (nes jo nebuvo suformuluota).
*   10. Refleksija (1 tšk.): Yra.

**2. Bendra taškų suma:** 8,5 / 17 tšk.

**3. Galutinis pažymys:** 5

**4. Patarimas:** Titai, prieš eksperimento atlikimą privalu surašyti pilną įvadinę dalį: darbo tikslas, kokius prietaisus naudosi ir kokias formules taikysi.$msg112$)
)
INSERT INTO public.student_messages (
  id,
  student_id,
  sender_id,
  title,
  content,
  is_read,
  created_at,
  is_hidden
)
SELECT
  gen_random_uuid(),
  md.student_id,
  'f9d16fcf-9b98-4a9a-becd-5dfe9abca73b'::uuid,
  'Laboratorinio darbo komentaras',
  md.content,
  false,
  now(),
  false
FROM message_data md
WHERE NOT EXISTS (
  SELECT 1
  FROM public.student_messages sm
  WHERE sm.student_id = md.student_id
    AND sm.title = 'Laboratorinio darbo komentaras'
    AND sm.content = md.content
);
