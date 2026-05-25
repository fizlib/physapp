-- One-time Supabase SQL Editor script for sending 2026-05-05 slegis grade messages.
-- Generated from C:\Users\deals\Desktop\vertinami-darbai\slegis\2026-05-05\*/darbai.md
-- Message title: Savarankiško darbo rezultatai
-- Expected included sections: 129 (1D 29, 1E 27, 1F 29, 1G 25, 1I 19)
-- Excluded non-student headings:
--   1E: 41-42 lapas

BEGIN;

DROP TABLE IF EXISTS _grade_messages;
DROP TABLE IF EXISTS _grade_name_aliases;
DROP TABLE IF EXISTS _grade_classrooms;
DROP TABLE IF EXISTS _grade_message_matches;
DROP TABLE IF EXISTS _grade_message_targets;
DROP TABLE IF EXISTS _grade_to_insert;
DROP TABLE IF EXISTS _grade_inserted;
DROP TABLE IF EXISTS _grade_sender;

CREATE OR REPLACE FUNCTION pg_temp.norm_grade_name(input_value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $func$
  SELECT regexp_replace(
    translate(
      lower(trim(coalesce(input_value, ''))),
      'ąčęėįšųūžáàäâéèëêíìïîóòöôúùüûñ',
      'aceeisuuzaaaaeeeeiiiioooouuuun'
    ),
    '\s+',
    ' ',
    'g'
  );
$func$;

CREATE OR REPLACE FUNCTION pg_temp.grade_name_tokens(input_value text)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
AS $func$
  SELECT coalesce(array_agg(token ORDER BY token), ARRAY[]::text[])
  FROM unnest(regexp_split_to_array(pg_temp.norm_grade_name(input_value), '\s+')) AS token
  WHERE token <> '';
$func$;

CREATE OR REPLACE FUNCTION pg_temp.grade_edit_distance(left_value text, right_value text)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $func$
DECLARE
  left_text text := coalesce(left_value, '');
  right_text text := coalesce(right_value, '');
  left_len integer := length(coalesce(left_value, ''));
  right_len integer := length(coalesce(right_value, ''));
  previous_row integer[];
  current_row integer[];
  row_index integer;
  col_index integer;
  cost integer;
BEGIN
  IF left_text = right_text THEN
    RETURN 0;
  END IF;

  IF left_len = 0 THEN
    RETURN right_len;
  END IF;

  IF right_len = 0 THEN
    RETURN left_len;
  END IF;

  previous_row := array_fill(0, ARRAY[right_len + 1]);

  FOR col_index IN 0..right_len LOOP
    previous_row[col_index + 1] := col_index;
  END LOOP;

  FOR row_index IN 1..left_len LOOP
    current_row := array_fill(0, ARRAY[right_len + 1]);
    current_row[1] := row_index;

    FOR col_index IN 1..right_len LOOP
      cost := CASE
        WHEN substr(left_text, row_index, 1) = substr(right_text, col_index, 1) THEN 0
        ELSE 1
      END;

      current_row[col_index + 1] := least(
        current_row[col_index] + 1,
        previous_row[col_index + 1] + 1,
        previous_row[col_index] + cost
      );
    END LOOP;

    previous_row := current_row;
  END LOOP;

  RETURN previous_row[right_len + 1];
END;
$func$;

CREATE OR REPLACE FUNCTION pg_temp.grade_name_similarity(left_value text, right_value text)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $func$
  SELECT CASE
    WHEN greatest(length(coalesce(left_value, '')), length(coalesce(right_value, ''))) = 0 THEN 1
    ELSE 1 - (
      pg_temp.grade_edit_distance(coalesce(left_value, ''), coalesce(right_value, ''))::numeric
      / greatest(length(coalesce(left_value, '')), length(coalesce(right_value, '')))::numeric
    )
  END;
$func$;

CREATE TEMP TABLE _grade_messages (
  class_name text NOT NULL,
  student_name text NOT NULL,
  content text NOT NULL
) ON COMMIT PRESERVE ROWS;

INSERT INTO _grade_messages (class_name, student_name, content)
VALUES
  ('1D', 'Vytautas Pečeliūnas', $grade_md$### Mokinys: Vytautas Pečeliūnas
Klasė: 1D  
Variantas: II  
Taškai: 15/16  
Pažymys: 10

| Užduotis | Taškai | Komentaras |
|---:|---:|---|
| 1 | 1/1 | Teisingai. |
| 2 | 0/1 | Teisingas atsakymas: B |
| 3 | 1/1 | Teisingai. |
| 4 | 1/1 | Teisingai. |
| 5 | 1/1 | Teisingai. |
| 6 | 1/1 | Teisingai. |
| 7 | 2/2 | Teisingai. |
| 8 | 2/2 | Teisingai. |
| 9a | 2/2 | Teisingai. |
| 9b | 2/2 | Teisingai. |
| 9c | 2/2 | Teisingai. |
| **Iš viso** | **15/16** | **Pažymys: 10** |$grade_md$),
  ('1D', 'Dominyka Keršytė', $grade_md$### Mokinys: Dominyka Keršytė
Klasė: 1D  
Variantas: II  
Taškai: 5/16  
Pažymys: 4

| Užduotis | Taškai | Komentaras |
|---:|---:|---|
| 1 | 0/1 | Teisingas atsakymas: D |
| 2 | 0/1 | Teisingas atsakymas: B |
| 3 | 1/1 | Teisingai. |
| 4 | 0/1 | Teisingas atsakymas: A |
| 5 | 0/1 | Teisingas atsakymas: A |
| 6 | 1/1 | Teisingai. |
| 7 | 2/2 | Teisingai. |
| 8 | 0/2 | Neteisingas galutinis atsakymas. |
| 9a | 1/2 | Neteisingai panaudoti užduoties duomenys - panaudotas ledo tankis vietoj vandens tankio. |
| 9b | 0/2 | Užduoties dalis neišspręsta. |
| 9c | 0/2 | Užduoties dalis neišspręsta. |
| **Iš viso** | **5/16** | **Pažymys: 4** |$grade_md$),
  ('1D', 'Deimantas Kovšikas', $grade_md$### Mokinys: Deimantas Kovšikas
Klasė: 1D  
Variantas: II  
Taškai: 9/16  
Pažymys: 6

| Užduotis | Taškai | Komentaras |
|---:|---:|---|
| 1 | 1/1 | Teisingai. |
| 2 | 1/1 | Teisingai. |
| 3 | 1/1 | Teisingai. |
| 4 | 1/1 | Teisingai. |
| 5 | 0/1 | Teisingas atsakymas: A |
| 6 | 1/1 | Teisingai. |
| 7 | 2/2 | Teisingai. |
| 8 | 0/2 | Užduoties dalis neišspręsta. |
| 9a | 2/2 | Teisingai. |
| 9b | 0/2 | Neteisingai panaudoti užduoties duomenys. |
| 9c | 0/2 | Neteisingai panaudoti užduoties duomenys. |
| **Iš viso** | **9/16** | **Pažymys: 6** |$grade_md$),
  ('1D', 'Simonas Ramanauskas', $grade_md$### Mokinys: Simonas Ramanauskas

Klasė: 1D
Variantas: II
Taškai: 8/16
Pažymys: 6

| Užduotis | Taškai | Komentaras |
| --- | --- | --- |
| 1 | 1/1 | Teisingai. |
| 2 | 0/1 | Teisingas atsakymas: B |
| 3 | 1/1 | Teisingai. |
| 4 | 1/1 | Teisingai. |
| 5 | 1/1 | Teisingai. |
| 6 | 1/1 | Teisingai. |
| 7 | 2/2 | Teisingai. |
| 8 | 1/2 | Formulė neišreikšta iki ieškomo dydžio. |
| 9a | 0/2 | Užduoties dalis neišspręsta. |
| 9b | 0/2 | Užduoties dalis neišspręsta. |
| 9c | 0/2 | Užduoties dalis neišspręsta. |
| **Iš viso** | **8/16** | **Pažymys: 6** |$grade_md$),
  ('1D', 'Evelina Benetytė', $grade_md$### Mokinys: Evelina Benetytė
Klasė: 1D  
Variantas: II  
Taškai: 4/16  
Pažymys: 3

| Užduotis | Taškai | Komentaras |
|---:|---:|---|
| 1 | 0/1 | Teisingas atsakymas: D |
| 2 | 1/1 | Teisingai. |
| 3 | 1/1 | Teisingai. |
| 4 | 1/1 | Teisingai. |
| 5 | 0/1 | Teisingas atsakymas: A |
| 6 | 0/1 | Teisingas atsakymas: B |
| 7 | 0/2 | Neteisingai parinkta formulė. |
| 8 | 1/2 | Teisingai apskaičiuota antroji jėga, tačiau galutinis plotas apskaičiuotas neteisingai. |
| 9a | 0/2 | Užduoties dalis neišspręsta. |
| 9b | 0/2 | Užduoties dalis neišspręsta. |
| 9c | 0/2 | Užduoties dalis neišspręsta. |
| **Iš viso** | **4/16** | **Pažymys: 3** |$grade_md$),
  ('1D', 'Simonas Šidlauskas', $grade_md$### Mokinys: Simonas Šidlauskas

Klasė: 1D
Variantas: II
Taškai: 12/16
Pažymys: 8

| Užduotis | Taškai | Komentaras |
| --- | --- | --- |
| 1 | 1/1 | Teisingai. |
| 2 | 1/1 | Teisingai. |
| 3 | 1/1 | Teisingai. |
| 4 | 0/1 | Teisingas atsakymas: A |
| 5 | 0/1 | Teisingas atsakymas: A |
| 6 | 1/1 | Teisingai. |
| 7 | 2/2 | Teisingai. |
| 8 | 2/2 | Teisingai. |
| 9a | 2/2 | Teisingai. |
| 9b | 2/2 | Sprendime gautas teisingas bendros masės rezultatas (18540 kg), tačiau atsakymų skiltyje neteisingai nurodyta ledo masė (16200 kg). |
| 9c | 0/2 | Neteisingai parinkta formulė. |
| **Iš viso** | **12/16** | **Pažymys: 8** |$grade_md$),
  ('1D', 'Luknė Masonaitė', $grade_md$### Mokinys: Luknė Masonaitė

Klasė: 1D
Variantas: II
Taškai: 6/16
Pažymys: 5

| Užduotis | Taškai | Komentaras |
| --- | --- | --- |
| 1 | 1/1 | Teisingai. |
| 2 | 1/1 | Teisingai. |
| 3 | 0/1 | Teisingas atsakymas: B |
| 4 | 0/1 | Teisingas atsakymas: A |
| 5 | 0/1 | Teisingas atsakymas: A |
| 6 | 1/1 | Teisingai. |
| 7 | 2/2 | Teisingai. |
| 8 | 1/2 | Neteisingas galutinis atsakymas. |
| 9a | 0/2 | Užduoties dalis neišspręsta. |
| 9b | 0/2 | Pateiktas tik neteisingas atsakymas be sprendimo eigos. |
| 9c | 0/2 | Pateiktas tik neteisingas atsakymas be sprendimo eigos. |
| **Iš viso** | **6/16** | **Pažymys: 5** |$grade_md$),
  ('1D', 'Rugilė Galinaitytė', $grade_md$### Mokinys: Rugilė Galinaitytė
Klasė: 1D  
Variantas: II  
Taškai: 6/16  
Pažymys: 5

| Užduotis | Taškai | Komentaras |
|---:|---:|---|
| 1 | 1/1 | Teisingai. |
| 2 | 0/1 | Teisingas atsakymas: B |
| 3 | 1/1 | Teisingai. |
| 4 | 1/1 | Teisingai. |
| 5 | 1/1 | Teisingai. |
| 6 | 1/1 | Teisingai. |
| 7 | 0/2 | Neteisingai parinkta formulė. |
| 8 | 0/2 | Neteisingai parinkta formulė. |
| 9a | 1/2 | Teisinga sprendimo eiga, bet panaudotas neteisingas vandens tankis (1000 kg/m³ vietoj 1030 kg/m³). |
| 9b | 0/2 | Užduoties dalis neišspręsta. |
| 9c | 0/2 | Neteisingai parinkta formulė. |
| **Iš viso** | **6/16** | **Pažymys: 5** |$grade_md$),
  ('1D', 'Mykolas Vaniašinas', $grade_md$### Mokinys: Mykolas Vaniašinas
Klasė: 1D  
Variantas: II  
Taškai: 7/16  
Pažymys: 5

| Užduotis | Taškai | Komentaras |
|---:|---:|---|
| 1 | 1/1 | Teisingai. |
| 2 | 0/1 | Teisingas atsakymas: B |
| 3 | 1/1 | Teisingai. |
| 4 | 1/1 | Teisingai. |
| 5 | 1/1 | Teisingai. |
| 6 | 1/1 | Teisingai. |
| 7 | 2/2 | Teisingai. |
| 8 | 0/2 | Užduoties dalis neišspręsta. |
| 9a | 0/2 | Užduoties dalis neišspręsta. |
| 9b | 0/2 | Neteisingas galutinis atsakymas. |
| 9c | 0/2 | Neteisingas galutinis atsakymas. |
| **Iš viso** | **7/16** | **Pažymys: 5** |$grade_md$),
  ('1D', 'Elzė Stakauskaitė', $grade_md$### Mokinys: Elzė Stakauskaitė

Klasė: 1D
Variantas: II
Taškai: 5/16
Pažymys: 4

| Užduotis | Taškai | Komentaras |
| --- | --- | --- |
| 1 | 1/1 | Teisingai. |
| 2 | 1/1 | Teisingai. |
| 3 | 0/1 | Teisingas atsakymas: B |
| 4 | 0/1 | Teisingas atsakymas: A |
| 5 | 0/1 | Teisingas atsakymas: A |
| 6 | 1/1 | Teisingai. |
| 7 | 2/2 | Teisingai. |
| 8 | 0/2 | Užduoties dalis neišspręsta. |
| 9a | 0/2 | Sprendimas išbrauktas. |
| 9b | 0/2 | Neteisingas galutinis atsakymas. |
| 9c | 0/2 | Neteisingas galutinis atsakymas. |
| **Iš viso** | **5/16** | **Pažymys: 4** |$grade_md$),
  ('1D', 'Areta Savickaitė', $grade_md$### Mokinys: Areta Savickaitė

Klasė: 1D
Variantas: II
Taškai: 5/16
Pažymys: 4

| Užduotis | Taškai | Komentaras |
| --- | --- | --- |
| 1 | 1/1 | Teisingai. |
| 2 | 1/1 | Teisingai. |
| 3 | 1/1 | Teisingai. |
| 4 | 1/1 | Teisingai. |
| 5 | 0/1 | Teisingas atsakymas: A |
| 6 | 1/1 | Teisingai. |
| 7 | 0/2 | Nenurodyta reikalinga formulė. |
| 8 | 0/2 | Pateiktas tik atsakymas, bet nėra sprendimo eigos. |
| 9a | 0/2 | Užduoties dalis neišspręsta. |
| 9b | 0/2 | Užduoties dalis neišspręsta. |
| 9c | 0/2 | Užduoties dalis neišspręsta. |
| **Iš viso** | **5/16** | **Pažymys: 4** |$grade_md$),
  ('1D', 'Ariana Irgaševa', $grade_md$### Mokinys: Ariana Irgaševa

Klasė: 1D
Variantas: II
Taškai: 10/16
Pažymys: 7

| Užduotis | Taškai | Komentaras |
| --- | --- | --- |
| 1 | 1/1 | Teisingai. |
| 2 | 0/1 | Teisingas atsakymas: B |
| 3 | 1/1 | Teisingai. |
| 4 | 0/1 | Teisingas atsakymas: A |
| 5 | 1/1 | Teisingai. |
| 6 | 1/1 | Teisingai. |
| 7 | 2/2 | Teisingai. |
| 8 | 2/2 | Teisingai. |
| 9a | 2/2 | Teisingai. |
| 9b | 0/2 | Apskaičiuota tik panirusios dalies masė, ne visa kūno masė. |
| 9c | 0/2 | Užduoties dalis neišspręsta. |
| **Iš viso** | **10/16** | **Pažymys: 7** |$grade_md$),
  ('1D', 'Dominykas Trainys', $grade_md$### Mokinys: Dominykas Trainys

Klasė: 1D
Variantas: II
Taškai: 7/16
Pažymys: 5

| Užduotis | Taškai | Komentaras |
| --- | --- | --- |
| 1 | 1/1 | Teisingai. |
| 2 | 0/1 | Teisingas atsakymas: B |
| 3 | 1/1 | Teisingai. |
| 4 | 1/1 | Teisingai. |
| 5 | 1/1 | Teisingai. |
| 6 | 1/1 | Teisingai. |
| 7 | 2/2 | Teisingai. |
| 8 | 0/2 | Užduoties dalis neišspręsta. |
| 9a | 0/2 | Užduoties dalis neišspręsta. |
| 9b | 0/2 | Užduoties dalis neišspręsta. |
| 9c | 0/2 | Užduoties dalis neišspręsta. |
| **Iš viso** | **7/16** | **Pažymys: 5** |$grade_md$),
  ('1D', 'Paulius Jasiukevičius', $grade_md$### Mokinys: Paulius Jasiukevičius
Klasė: 1D  
Variantas: II  
Taškai: 9/16  
Pažymys: 6

| Užduotis | Taškai | Komentaras |
|---:|---:|---|
| 1 | 1/1 | Teisingai. |
| 2 | 0/1 | Teisingas atsakymas: B |
| 3 | 1/1 | Teisingai. |
| 4 | 1/1 | Teisingai. |
| 5 | 1/1 | Teisingai. |
| 6 | 1/1 | Teisingai. |
| 7 | 2/2 | Teisingai. |
| 8 | 2/2 | Teisingai. |
| 9a | 0/2 | Užduoties dalis neišspręsta. |
| 9b | 0/2 | Užduoties dalis neišspręsta. |
| 9c | 0/2 | Užduoties dalis neišspręsta. |
| **Iš viso** | **9/16** | **Pažymys: 6** |$grade_md$),
  ('1D', 'Kornelijus Matonis', $grade_md$### Mokinys: Kornelijus Matonis

Klasė: 1D
Variantas: II
Taškai: 7/16
Pažymys: 5

| Užduotis | Taškai | Komentaras |
| --- | --- | --- |
| 1 | 1/1 | Teisingai. |
| 2 | 1/1 | Teisingai. |
| 3 | 1/1 | Teisingai. |
| 4 | 1/1 | Teisingai. |
| 5 | 1/1 | Teisingai. |
| 6 | 1/1 | Teisingai. |
| 7 | 0/2 | Sprendimas nebaigtas spręsti, neteisingos formulės. |
| 8 | 1/2 | Neteisingi skaičiavimai ir matavimo vienetų keitimas. |
| 9a | 0/2 | Užduoties dalis neišspręsta. |
| 9b | 0/2 | Užduoties dalis neišspręsta. |
| 9c | 0/2 | Užduoties dalis neišspręsta. |
| **Iš viso** | **7/16** | **Pažymys: 5** |$grade_md$),
  ('1D', 'Atėnė Šakelė', $grade_md$### Mokinys: Atėnė Šakelė

Klasė: 1D
Variantas: I
Taškai: 7/16
Pažymys: 5

| Užduotis | Taškai | Komentaras |
| --- | --- | --- |
| 1 | 1/1 | Teisingai. |
| 2 | 1/1 | Teisingai. |
| 3 | 0/1 | Teisingas atsakymas: B |
| 4 | 1/1 | Teisingai. |
| 5 | 1/1 | Teisingai. |
| 6 | 1/1 | Teisingai. |
| 7 | 2/2 | Teisingai. |
| 8 | 0/2 | Neteisingas sprendimas. |
| 9a | 0/2 | Užduoties dalis neišspręsta. |
| 9b | 0/2 | Užduoties dalis neišspręsta. |
| 9c | 0/2 | Užduoties dalis neišspręsta. |
| **Iš viso** | **7/16** | **Pažymys: 5** |$grade_md$),
  ('1D', 'Augustas Tadas Lydekaitis', $grade_md$### Mokinys: Augustas Tadas Lydekaitis

Klasė: 1D
Variantas: I
Taškai: 4/16
Pažymys: 3

| Užduotis | Taškai | Komentaras |
| --- | --- | --- |
| 1 | 0/1 | Teisingas atsakymas: C |
| 2 | 0/1 | Teisingas atsakymas: D |
| 3 | 1/1 | Teisingai. |
| 4 | 1/1 | Teisingai. |
| 5 | 1/1 | Teisingai. |
| 6 | 1/1 | Teisingai. |
| 7 | 0/2 | Neteisingai parinkta formulė. |
| 8 | 0/2 | Užduoties dalis neišspręsta. |
| 9a | 0/2 | Sprendimo eiga neparodyta. |
| 9b | 0/2 | Užduoties dalis neišspręsta. |
| 9c | 0/2 | Užduoties dalis neišspręsta. |
| **Iš viso** | **4/16** | **Pažymys: 3** |$grade_md$),
  ('1D', 'Deividas Sadonis', $grade_md$### Mokinys: Deividas Sadonis

Klasė: 1D
Variantas: I
Taškai: 16/16
Pažymys: 10

| Užduotis | Taškai | Komentaras |
| --- | --- | --- |
| 1 | 1/1 | Teisingai. |
| 2 | 1/1 | Teisingai. |
| 3 | 1/1 | Teisingai. |
| 4 | 1/1 | Teisingai. |
| 5 | 1/1 | Teisingai. |
| 6 | 1/1 | Teisingai. |
| 7 | 2/2 | Teisingai. |
| 8 | 2/2 | Teisingai. |
| 9a | 2/2 | Teisingai. |
| 9b | 2/2 | Teisingai. |
| 9c | 2/2 | Teisingai. |
| **Iš viso** | **16/16** | **Pažymys: 10** |$grade_md$),
  ('1D', 'Mėta Kaminskaitė', $grade_md$### Mokinys: Mėta Kaminskaitė

Klasė: 1D
Variantas: I
Taškai: 12.5/16
Pažymys: 8

| Užduotis | Taškai | Komentaras |
| --- | --- | --- |
| 1 | 1/1 | Teisingai. |
| 2 | 1/1 | Teisingai. |
| 3 | 1/1 | Teisingai. |
| 4 | 1/1 | Teisingai. |
| 5 | 1/1 | Teisingai. |
| 6 | 1/1 | Teisingai. |
| 7 | 2/2 | Teisingai. |
| 8 | 1/2 | Teisinga formulė, bet padaryta klaida įstatant reikšmes. |
| 9a | 1.5/2 | Nenurodyti matavimo vienetai. |
| 9b | 2/2 | Teisingai. |
| 9c | 0/2 | Užduoties dalis neišspręsta. |
| **Iš viso** | **12.5/16** | **Pažymys: 8** |$grade_md$),
  ('1D', 'Samanta Zareckytė', $grade_md$### Mokinys: Samanta Zareckytė

Klasė: 1D
Variantas: I
Taškai: 4/16
Pažymys: 3

| Užduotis | Taškai | Komentaras |
| --- | --- | --- |
| 1 | 1/1 | Teisingai. |
| 2 | 1/1 | Teisingai. |
| 3 | 0/1 | Teisingas atsakymas: B |
| 4 | 1/1 | Teisingai. |
| 5 | 1/1 | Teisingai. |
| 6 | 0/1 | Teisingas atsakymas: B |
| 7 | 0/2 | Neteisingai parinkta formulė. |
| 8 | 0/2 | Neteisingi skaičiavimai. |
| 9a | 0/2 | Užduoties dalis neišspręsta. |
| 9b | 0/2 | Užduoties dalis neišspręsta. |
| 9c | 0/2 | Užduoties dalis neišspręsta. |
| **Iš viso** | **4/16** | **Pažymys: 3** |$grade_md$),
  ('1D', 'Julius Bartoševičius', $grade_md$### Mokinys: Julius Bartoševičius
Klasė: 1D  
Variantas: I  
Taškai: 16/16  
Pažymys: 10

| Užduotis | Taškai | Komentaras |
|---:|---:|---|
| 1 | 1/1 | Teisingai. |
| 2 | 1/1 | Teisingai. |
| 3 | 1/1 | Teisingai. |
| 4 | 1/1 | Teisingai. |
| 5 | 1/1 | Teisingai. |
| 6 | 1/1 | Teisingai. |
| 7 | 2/2 | Teisingai. |
| 8 | 2/2 | Teisingai. |
| 9a | 2/2 | Teisingai. |
| 9b | 2/2 | Teisingai. |
| 9c | 2/2 | Teisingai. |
| **Iš viso** | **16/16** | **Pažymys: 10** |$grade_md$),
  ('1D', 'Ąžuolas Afanasjevas', $grade_md$### Mokinys: Ąžuolas Afanasjevas

Klasė: 1D
Variantas: I
Taškai: 16/16
Pažymys: 10

| Užduotis | Taškai | Komentaras |
| --- | --- | --- |
| 1 | 1/1 | Teisingai. |
| 2 | 1/1 | Teisingai. |
| 3 | 1/1 | Teisingai. |
| 4 | 1/1 | Teisingai. |
| 5 | 1/1 | Teisingai. |
| 6 | 1/1 | Teisingai. |
| 7 | 2/2 | Teisingai. |
| 8 | 2/2 | Teisingai. |
| 9a | 2/2 | Teisingai. |
| 9b | 2/2 | Teisingai. |
| 9c | 2/2 | Teisingai. |
| **Iš viso** | **16/16** | **Pažymys: 10** |$grade_md$),
  ('1D', 'Eivydas Bučius', $grade_md$### Mokinys: Eivydas Bučius

Klasė: 1D
Variantas: I
Taškai: 15/16
Pažymys: 10

| Užduotis | Taškai | Komentaras |
| --- | --- | --- |
| 1 | 1/1 | Teisingai. |
| 2 | 1/1 | Teisingai. |
| 3 | 1/1 | Teisingai. |
| 4 | 1/1 | Teisingai. |
| 5 | 1/1 | Teisingai. |
| 6 | 1/1 | Teisingai. |
| 7 | 2/2 | Teisingai. |
| 8 | 2/2 | Teisingai. |
| 9a | 1/2 | Teisinga Archimedo jėgos formulė, tačiau panaudotas bendrasis ledo tūris vietoj panirusio tūrio, todėl gautas neteisingas skaičiavimo rezultatas. |
| 9b | 2/2 | Teisingai. |
| 9c | 2/2 | Teisingai. |
| **Iš viso** | **15/16** | **Pažymys: 10** |$grade_md$),
  ('1D', 'Laurynas Kiškis', $grade_md$### Mokinys: Laurynas Kiškis

Klasė: 1D
Variantas: I
Taškai: 6/16
Pažymys: 5

| Užduotis | Taškai | Komentaras |
| --- | --- | --- |
| 1 | 0/1 | Teisingas atsakymas: C |
| 2 | 0/1 | Teisingas atsakymas: D |
| 3 | 1/1 | Teisingai. |
| 4 | 1/1 | Teisingai. |
| 5 | 1/1 | Teisingai. |
| 6 | 1/1 | Teisingai. |
| 7 | 2/2 | Teisingai. |
| 8 | 0/2 | Užduotis nebaigta spręsti. |
| 9a | 0/2 | Užduoties dalis neišspręsta. |
| 9b | 0/2 | Užduoties dalis neišspręsta. |
| 9c | 0/2 | Užduoties dalis neišspręsta. |
| **Iš viso** | **6/16** | **Pažymys: 5** |$grade_md$),
  ('1D', 'Vasarė Cidzikaitė', $grade_md$### Mokinys: Vasarė Cidzikaitė

Klasė: 1D
Variantas: I
Taškai: 7/16
Pažymys: 5

| Užduotis | Taškai | Komentaras |
| --- | --- | --- |
| 1 | 1/1 | Teisingai. |
| 2 | 1/1 | Teisingai. |
| 3 | 0/1 | Teisingas atsakymas: B |
| 4 | 0/1 | Teisingas atsakymas: C |
| 5 | 1/1 | Teisingai. |
| 6 | 0/1 | Teisingas atsakymas: B |
| 7 | 2/2 | Teisingai. |
| 8 | 2/2 | Teisingai. |
| 9a | 0/2 | Užduoties dalis neišspręsta. |
| 9b | 0/2 | Užduotis nebaigta spręsti. |
| 9c | 0/2 | Užduoties dalis neišspręsta. |
| **Iš viso** | **7/16** | **Pažymys: 5** |$grade_md$),
  ('1D', 'Lukas Statkus', $grade_md$### Mokinys: Lukas Statkus
Klasė: 1D  
Variantas: I  
Taškai: 10/16  
Pažymys: 7

| Užduotis | Taškai | Komentaras |
|---:|---:|---|
| 1 | 1/1 | Teisingai. |
| 2 | 1/1 | Teisingai. |
| 3 | 1/1 | Teisingai. |
| 4 | 1/1 | Teisingai. |
| 5 | 1/1 | Teisingai. |
| 6 | 1/1 | Teisingai. |
| 7 | 2/2 | Teisingai. |
| 8 | 2/2 | Teisingai. |
| 9a | 0/2 | Užduoties dalis neišspręsta. |
| 9b | 0/2 | Užduoties dalis neišspręsta. |
| 9c | 0/2 | Užduoties dalis neišspręsta. |
| **Iš viso** | **10/16** | **Pažymys: 7** |$grade_md$),
  ('1D', 'Paulius Povilonis', $grade_md$### Mokinys: Paulius Povilonis

Klasė: 1D
Variantas: I
Taškai: 4/16
Pažymys: 3

| Užduotis | Taškai | Komentaras |
| --- | --- | --- |
| 1 | 1/1 | Teisingai. |
| 2 | 1/1 | Teisingai. |
| 3 | 1/1 | Teisingai. |
| 4 | 0/1 | Teisingas atsakymas: C |
| 5 | 1/1 | Teisingai. |
| 6 | 0/1 | Teisingas atsakymas: B |
| 7 | 0/2 | Neteisingi skaičiavimai. |
| 8 | 0/2 | Neteisingi skaičiavimai. |
| 9a | 0/2 | Išbrauktas sprendimas. |
| 9b | 0/2 | Neteisingas sprendimas. |
| 9c | 0/2 | Užduoties dalis neišspręsta. |
| **Iš viso** | **4/16** | **Pažymys: 3** |$grade_md$),
  ('1D', 'Matas Pusvaškis', $grade_md$### Mokinys: Matas Pusvaškis

Klasė: 1D
Variantas: I
Taškai: 11/16
Pažymys: 7

| Užduotis | Taškai | Komentaras |
| --- | --- | --- |
| 1 | 1/1 | Teisingai. |
| 2 | 1/1 | Teisingai. |
| 3 | 1/1 | Teisingai. |
| 4 | 1/1 | Teisingai. |
| 5 | 1/1 | Teisingai. |
| 6 | 0/1 | Teisingas atsakymas: B |
| 7 | 0/2 | Neteisingi skaičiavimai. |
| 8 | 2/2 | Teisingai. |
| 9a | 2/2 | Teisingai. |
| 9b | 2/2 | Teisingai. |
| 9c | 0/2 | Užduoties dalis neišspręsta. |
| **Iš viso** | **11/16** | **Pažymys: 7** |$grade_md$),
  ('1D', 'Viltė Marcinonytė', $grade_md$### Mokinys: Viltė Marcinonytė

Klasė: 1D
Variantas: I
Taškai: 15/16
Pažymys: 10

| Užduotis | Taškai | Komentaras |
| --- | --- | --- |
| 1 | 1/1 | Teisingai. |
| 2 | 1/1 | Teisingai. |
| 3 | 1/1 | Teisingai. |
| 4 | 1/1 | Teisingai. |
| 5 | 1/1 | Teisingai. |
| 6 | 0/1 | Teisingas atsakymas: B |
| 7 | 2/2 | Teisingai. |
| 8 | 2/2 | Teisingai. |
| 9a | 2/2 | Teisingai. |
| 9b | 2/2 | Teisingai. |
| 9c | 2/2 | Teisingai. |
| **Iš viso** | **15/16** | **Pažymys: 10** |$grade_md$),
  ('1E', 'Ivaškaitė Laurita', $grade_md$### Mokinys: Ivaškaitė Laurita

Klasė: 1E
Variantas: II
Taškai: 12/16
Pažymys: 8

|    Užduotis |    Taškai | Komentaras                                                                                                                              |
| ----------: | --------: | --------------------------------------------------------------------------------------------------------------------------------------- |
|           1 |       1/1 | Teisingai.                                                                                                                              |
|           2 |       0/1 | Teisingas atsakymas: B                                                                                                                  |
|           3 |       1/1 | Teisingai.                                                                                                                              |
|           4 |       1/1 | Teisingai.                                                                                                                              |
|           5 |       0/1 | Teisingas atsakymas: A                                                                                                                  |
|           6 |       1/1 | Teisingai.                                                                                                                              |
|           7 |       2/2 | Teisingai.                                                                                                                              |
|           8 |       2/2 | Teisingai.                                                                                                                              |
|          9a |       2/2 | Teisingai.                                                                                                                              |
|          9b |       0/2 | Neteisingai panaudoti užduoties duomenys.                                                                                               |
|          9c |       2/2 | Galutinis atsakymas neteisingas, nes naudotas ankstesnėje dalyje gautas rezultatas, bet sprendimo eiga teisinga, todėl taškai skiriami. |
| **Iš viso** | **12/16** | **Pažymys: 8**                                                                                                                          |$grade_md$),
  ('1E', 'Kiukytė Eglė', $grade_md$### Mokinys: Kiukytė Eglė

Klasė: 1E
Variantas: II
Taškai: 4/16
Pažymys: 3

| Užduotis | Taškai | Komentaras |
| --- | --- | --- |
| 1 | 1/1 | Teisingai. |
| 2 | 0/1 | Teisingas atsakymas: B |
| 3 | 0/1 | Teisingas atsakymas: B |
| 4 | 1/1 | Teisingai. |
| 5 | 0/1 | Teisingas atsakymas: A |
| 6 | 1/1 | Teisingai. |
| 7 | 0/2 | Neteisingai parinkta formulė. |
| 8 | 1/2 | Galutinis atsakymas neteisingas |
| 9a | 0/2 | Neteisingai parinkta formulė. |
| 9b | 0/2 | Neteisingai panaudoti užduoties duomenys. |
| 9c | 0/2 | Apskaičiuotas ne tas fizikinis dydis. |
| **Iš viso** | **4/16** | **Pažymys: 3** |$grade_md$),
  ('1E', 'Skruodytė Urtė', $grade_md$### Mokinys: Skruodytė Urtė

Klasė: 1E
Variantas: II
Taškai: 13/16
Pažymys: 8

| Užduotis | Taškai | Komentaras |
| --- | --- | --- |
| 1 | 1/1 | Teisingai. |
| 2 | 0/1 | Teisingas atsakymas: B |
| 3 | 1/1 | Teisingai. |
| 4 | 0/1 | Teisingas atsakymas: A |
| 5 | 1/1 | Teisingai. |
| 6 | 1/1 | Teisingai. |
| 7 | 2/2 | Teisingai. |
| 8 | 1/2 | Neteisingai parinkta formulė. |
| 9a | 2/2 | Teisingai. |
| 9b | 2/2 | Teisingai. |
| 9c | 2/2 | Teisingai. |
| **Iš viso** | **13/16** | **Pažymys: 8** |$grade_md$),
  ('1E', 'Pestinytė Ugnė', $grade_md$### Mokinys: Pestinytė Ugnė

Klasė: 1E
Variantas: II
Taškai: 5.5/16
Pažymys: 4

| Užduotis | Taškai | Komentaras |
| --- | --- | --- |
| 1 | 1/1 | Teisingai. |
| 2 | 0/1 | Teisingas atsakymas: B |
| 3 | 1/1 | Teisingai. |
| 4 | 0/1 | Teisingas atsakymas: A |
| 5 | 0/1 | Teisingas atsakymas: A |
| 6 | 0/1 | Teisingas atsakymas: B |
| 7 | 2/2 | Teisingai. |
| 8 | 0/2 | Sprendimas nebaigtas. |
| 9a | 1.5/2 | Neteisingai nurodyti matavimo vienetai. |
| 9b | 0/2 | Neteisingai panaudoti užduoties duomenys. |
| 9c | 0/2 | Apskaičiuotas ne tas fizikinis dydis. |
| **Iš viso** | **5.5/16** | **Pažymys: 4** |$grade_md$),
  ('1E', 'Kuzmickas Edvinas', $grade_md$### Mokinys: Kuzmickas Edvinas

Klasė: 1E
Variantas: II
Taškai: 4/16
Pažymys: 3

|    Užduotis |   Taškai | Komentaras                   |
| ----------: | -------: | ---------------------------- |
|           1 |      0/1 | Teisingas atsakymas: D       |
|           2 |      1/1 | Teisingai.                   |
|           3 |      1/1 | Teisingai.                   |
|           4 |      0/1 | Teisingas atsakymas: A       |
|           5 |      0/1 | Teisingas atsakymas: A       |
|           6 |      0/1 | Teisingas atsakymas: B       |
|           7 |      2/2 | Teisingai.                   |
|           8 |      0/2 | Užduoties dalis neišspręsta. |
|          9a |      0/2 | Užduoties dalis neišspręsta. |
|          9b |      0/2 | Užduoties dalis neišspręsta. |
|          9c |      0/2 | Užduoties dalis neišspręsta. |
| **Iš viso** | **4/16** | **Pažymys: 3**               |$grade_md$),
  ('1E', 'Valeikaitė Ugnė', $grade_md$### Mokinys: Valeikaitė Ugnė

Klasė: 1E
Variantas: II
Taškai: 12/16
Pažymys: 8

| Užduotis | Taškai | Komentaras |
| --- | --- | --- |
| 1 | 1/1 | Teisingai. |
| 2 | 0/1 | Teisingas atsakymas: B |
| 3 | 0/1 | Teisingas atsakymas: B |
| 4 | 0/1 | Teisingas atsakymas: A |
| 5 | 1/1 | Teisingai. |
| 6 | 0/1 | Teisingas atsakymas: B |
| 7 | 2/2 | Teisingai. |
| 8 | 2/2 | Teisingai. |
| 9a | 2/2 | Teisingai. |
| 9b | 2/2 | Teisingai. |
| 9c | 2/2 | Teisingai. |
| **Iš viso** | **12/16** | **Pažymys: 8** |$grade_md$),
  ('1E', 'Kačanaitė Evelina', $grade_md$### Mokinys: Kačanaitė Evelina

Klasė: 1E
Variantas: II
Taškai: 14/16
Pažymys: 9

|    Užduotis |    Taškai | Komentaras                       |
| ----------: | --------: | -------------------------------- |
|           1 |       1/1 | Teisingai.                       |
|           2 |       0/1 | Teisingas atsakymas: B           |
|           3 |       1/1 | Teisingai.                       |
|           4 |       1/1 | Teisingai.                       |
|           5 |       1/1 | Teisingai.                       |
|           6 |       1/1 | Teisingai.                       |
|           7 |       2/2 | Teisingai.                       |
|           8 |       1/2 | Neteisingas galutinis atsakymas. |
|          9a |       2/2 | Teisingai.                       |
|          9b |       2/2 | Teisingai.                       |
|          9c |       2/2 | Teisingai.                       |
| **Iš viso** | **14/16** | **Pažymys: 9**                   |$grade_md$),
  ('1E', 'Jankūnas Kernius', $grade_md$### Mokinys: Jankūnas Kernius

Klasė: 1E
Variantas: II
Taškai: 4/16
Pažymys: 3

|    Užduotis |   Taškai | Komentaras                                |
| ----------: | -------: | ----------------------------------------- |
|           1 |      1/1 | Teisingai.                                |
|           2 |      1/1 | Teisingai.                                |
|           3 |      0/1 | Teisingas atsakymas: B                    |
|           4 |      0/1 | Teisingas atsakymas: A                    |
|           5 |      0/1 | Teisingas atsakymas: A                    |
|           6 |      1/1 | Teisingai.                                |
|           7 |      1/2 | Neteisingai įstatytos reikšmės į formulę. |
|           8 |      0/2 | Sprendimas nebaigtas.                     |
|          9a |      0/2 | Užduoties dalis neišspręsta.              |
|          9b |      0/2 | Užduoties dalis neišspręsta.              |
|          9c |      0/2 | Užduoties dalis neišspręsta.              |
| **Iš viso** | **4/16** | **Pažymys: 3**                            |$grade_md$),
  ('1E', 'Bislytė Jonė', $grade_md$### Mokinys: Bislytė Jonė

Klasė: 1E
Variantas: II
Taškai: 5/16
Pažymys: 4

|    Užduotis |   Taškai | Komentaras                                |
| ----------: | -------: | ----------------------------------------- |
|           1 |      1/1 | Teisingai.                                |
|           2 |      0/1 | Teisingas atsakymas: B                    |
|           3 |      0/1 | Teisingas atsakymas: B                    |
|           4 |      0/1 | Teisingas atsakymas: A                    |
|           5 |      1/1 | Teisingai.                                |
|           6 |      0/1 | Teisingas atsakymas: B                    |
|           7 |      2/2 | Teisingai.                                |
|           8 |      0/2 | Neteisingai parinkta formulė.             |
|          9a |      1/2 | Neteisingai panaudoti užduoties duomenys. |
|          9b |      0/2 | Neteisingas galutinis atsakymas.          |
|          9c |      0/2 | Užduoties dalis neišspręsta.              |
| **Iš viso** | **5/16** | **Pažymys: 4**                            |$grade_md$),
  ('1E', 'Markevičiūtė Judrė', $grade_md$### Mokinys: Markevičiūtė Judrė

Klasė: 1E
Variantas: II
Taškai: 8/16
Pažymys: 6

|    Užduotis |   Taškai | Komentaras                                |
| ----------: | -------: | ----------------------------------------- |
|           1 |      1/1 | Teisingai.                                |
|           2 |      1/1 | Teisingai.                                |
|           3 |      1/1 | Teisingai.                                |
|           4 |      1/1 | Teisingai.                                |
|           5 |      1/1 | Teisingai.                                |
|           6 |      0/1 | Teisingas atsakymas: B                    |
|           7 |      2/2 | Teisingai.                                |
|           8 |      1/2 | Neteisingai įstatytos reikšmės į formulę. |
|          9a |      0/2 | Nenurodyta reikalinga formulė.            |
|          9b |      0/2 | Užduoties dalis neišspręsta.              |
|          9c |      0/2 | Užduoties dalis neišspręsta.              |
| **Iš viso** | **8/16** | **Pažymys: 6**                            |$grade_md$),
  ('1E', 'Pociūtė Meda', $grade_md$### Mokinys: Pociūtė Meda

Klasė: 1E
Variantas: II
Taškai: 13/16
Pažymys: 8

|    Užduotis |    Taškai | Komentaras             |
| ----------: | --------: | ---------------------- |
|           1 |       1/1 | Teisingai.             |
|           2 |       0/1 | Teisingas atsakymas: B |
|           3 |       0/1 | Teisingas atsakymas: B |
|           4 |       1/1 | Teisingai.             |
|           5 |       0/1 | Teisingas atsakymas: A |
|           6 |       1/1 | Teisingai.             |
|           7 |       2/2 | Teisingai.             |
|           8 |       2/2 | Teisingai.             |
|          9a |       2/2 | Teisingai.             |
|          9b |       2/2 | Teisingai.             |
|          9c |       2/2 | Teisingai.             |
| **Iš viso** | **13/16** | **Pažymys: 8**         |$grade_md$),
  ('1E', 'Gaidytė Aurelija', $grade_md$### Mokinys: Gaidytė Aurelija

Klasė: 1E
Variantas: II
Taškai: 14/16
Pažymys: 9

|    Užduotis |    Taškai | Komentaras             |
| ----------: | --------: | ---------------------- |
|           1 |       1/1 | Teisingai.             |
|           2 |       0/1 | Teisingas atsakymas: B |
|           3 |       1/1 | Teisingai.             |
|           4 |       0/1 | Teisingas atsakymas: A |
|           5 |       1/1 | Teisingai.             |
|           6 |       1/1 | Teisingai.             |
|           7 |       2/2 | Teisingai.             |
|           8 |       2/2 | Teisingai.             |
|          9a |       2/2 | Teisingai.             |
|          9b |       2/2 | Teisingai.             |
|          9c |       2/2 | Teisingai.             |
| **Iš viso** | **14/16** | **Pažymys: 9**         |$grade_md$),
  ('1E', 'Skurvydaitė Atėnė', $grade_md$### Mokinys: Skurvydaitė Atėnė

Klasė: 1E
Variantas: II
Taškai: 12/16
Pažymys: 8

|    Užduotis |    Taškai | Komentaras             |
| ----------: | --------: | ---------------------- |
|           1 |       1/1 | Teisingai.             |
|           2 |       0/1 | Teisingas atsakymas: B |
|           3 |       0/1 | Teisingas atsakymas: B |
|           4 |       0/1 | Teisingas atsakymas: A |
|           5 |       1/1 | Teisingai.             |
|           6 |       0/1 | Teisingas atsakymas: B |
|           7 |       2/2 | Teisingai.             |
|           8 |       2/2 | Teisingai.             |
|          9a |       2/2 | Teisingai.             |
|          9b |       2/2 | Teisingai.             |
|          9c |       2/2 | Teisingai.             |
| **Iš viso** | **12/16** | **Pažymys: 8**         |$grade_md$),
  ('1E', 'Pliaugaitė Germilė', $grade_md$### Mokinys: Pliaugaitė Germilė

Klasė: 1E
Variantas: II
Taškai: 3/16
Pažymys: 2

|    Užduotis |   Taškai | Komentaras                    |
| ----------: | -------: | ----------------------------- |
|           1 |      0/1 | Teisingas atsakymas: D        |
|           2 |      1/1 | Teisingai.                    |
|           3 |      1/1 | Teisingai.                    |
|           4 |      1/1 | Teisingai.                    |
|           5 |      0/1 | Teisingas atsakymas: A        |
|           6 |      0/1 | Teisingas atsakymas: B        |
|           7 |      0/2 | Neteisingai parinkta formulė. |
|           8 |      0/2 | Neteisingai parinkta formulė. |
|          9a |      0/2 | Užduoties dalis neišspręsta.  |
|          9b |      0/2 | Užduoties dalis neišspręsta.  |
|          9c |      0/2 | Užduoties dalis neišspręsta.  |
| **Iš viso** | **3/16** | **Pažymys: 2**                |$grade_md$),
  ('1E', 'Glinskytė Liepa', $grade_md$### Mokinys: Glinskytė Liepa

Klasė: 1E
Variantas: I
Taškai: 5/16
Pažymys: 4

| Užduotis | Taškai | Komentaras |
| --- | --- | --- |
| 1 | 1/1 | Teisingai. |
| 2 | 1/1 | Teisingai. |
| 3 | 0/1 | Teisingas atsakymas: B |
| 4 | 0/1 | Teisingas atsakymas: C |
| 5 | 0/1 | Teisingas atsakymas: D |
| 6 | 0/1 | Teisingas atsakymas: B |
| 7 | 2/2 | Teisingai. |
| 8 | 1/2 | Klaida keičiant matavimo vienetus. |
| 9a | 0/2 | Užduoties dalis neišspręsta. |
| 9b | 0/2 | Neteisingas galutinis atsakymas. |
| 9c | 0/2 | Užduoties dalis neišspręsta. |
| **Iš viso** | **5/16** | **Pažymys: 4** |$grade_md$),
  ('1E', 'Kacevičiūtė Giedrė', $grade_md$### Mokinys: Kacevičiūtė Giedrė

Klasė: 1E
Variantas: I
Taškai: 12.5/16
Pažymys: 8

| Užduotis | Taškai | Komentaras |
| --- | --- | --- |
| 1 | 1/1 | Teisingai. |
| 2 | 0/1 | Teisingas atsakymas: D |
| 3 | 1/1 | Teisingai. |
| 4 | 1/1 | Teisingai. |
| 5 | 1/1 | Teisingai. |
| 6 | 0/1 | Teisingas atsakymas: B |
| 7 | 2/2 | Teisingai. |
| 8 | 1.5/2 | Neteisingai nurodyti matavimo vienetai. |
| 9a | 2/2 | Teisingai. |
| 9b | 1/2 | Skaičiavimo klaida. |
| 9c | 2/2 | Teisingai. |
| **Iš viso** | **12.5/16** | **Pažymys: 8** |$grade_md$),
  ('1E', 'Sarapinaitė Elija', $grade_md$### Mokinys: Sarapinaitė Elija

Klasė: 1E
Variantas: I
Taškai: 14/16
Pažymys: 9

| Užduotis | Taškai | Komentaras |
| --- | --- | --- |
| 1 | 1/1 | Teisingai. |
| 2 | 1/1 | Teisingai. |
| 3 | 1/1 | Teisingai. |
| 4 | 0/1 | Teisingas atsakymas: C |
| 5 | 1/1 | Teisingai. |
| 6 | 1/1 | Teisingai. |
| 7 | 1/2 | Formulė neišreikšta iki ieškomo dydžio. |
| 8 | 2/2 | Teisingai. |
| 9a | 2/2 | Teisingai. |
| 9b | 2/2 | Teisingai. |
| 9c | 2/2 | Teisingai. |
| **Iš viso** | **14/16** | **Pažymys: 9** |$grade_md$),
  ('1E', 'Markevičiūtė Augustė', $grade_md$### Mokinys: Markevičiūtė Augustė

Klasė: 1E
Variantas: I
Taškai: 10/16
Pažymys: 7

| Užduotis | Taškai | Komentaras |
| --- | --- | --- |
| 1 | 1/1 | Teisingai. |
| 2 | 1/1 | Teisingai. |
| 3 | 1/1 | Teisingai. |
| 4 | 1/1 | Teisingai. |
| 5 | 1/1 | Teisingai. |
| 6 | 1/1 | Teisingai. |
| 7 | 2/2 | Teisingai. |
| 8 | 2/2 | Teisingai. |
| 9a | 0/2 | Neteisingas galutinis atsakymas. |
| 9b | 0/2 | Užduoties dalis neišspręsta. |
| 9c | 0/2 | Užduoties dalis neišspręsta. |
| **Iš viso** | **10/16** | **Pažymys: 7** |$grade_md$),
  ('1E', 'Buteikytė Ieva', $grade_md$### Mokinys: Buteikytė Ieva

Klasė: 1E
Variantas: I
Taškai: 9/16
Pažymys: 6

| Užduotis | Taškai | Komentaras |
| --- | --- | --- |
| 1 | 1/1 | Teisingai. |
| 2 | 1/1 | Teisingai. |
| 3 | 0/1 | Teisingas atsakymas: B |
| 4 | 1/1 | Teisingai. |
| 5 | 1/1 | Teisingai. |
| 6 | 1/1 | Teisingai. |
| 7 | 2/2 | Teisingai. |
| 8 | 2/2 | Teisingai. |
| 9a | 0/2 | Sprendimas nebaigtas. |
| 9b | 0/2 | Užduoties dalis neišspręsta. |
| 9c | 0/2 | Užduoties dalis neišspręsta. |
| **Iš viso** | **9/16** | **Pažymys: 6** |$grade_md$),
  ('1E', 'Nausaitė Ugnė', $grade_md$### Mokinys: Nausaitė Ugnė

Klasė: 1E
Variantas: I
Taškai: 16/16
Pažymys: 10

| Užduotis | Taškai | Komentaras |
| --- | --- | --- |
| 1 | 1/1 | Teisingai. |
| 2 | 1/1 | Teisingai. |
| 3 | 1/1 | Teisingai. |
| 4 | 1/1 | Teisingai. |
| 5 | 1/1 | Teisingai. |
| 6 | 1/1 | Teisingai. |
| 7 | 2/2 | Teisingai. |
| 8 | 2/2 | Teisingai. |
| 9a | 2/2 | Teisingai. |
| 9b | 2/2 | Teisingai. |
| 9c | 2/2 | Teisingai. |
| **Iš viso** | **16/16** | **Pažymys: 10** |$grade_md$),
  ('1E', 'Dikčiūtė Justė', $grade_md$### Mokinys: Dikčiūtė Justė

Klasė: 1E
Variantas: I
Taškai: 14.5/16
Pažymys: 9

| Užduotis | Taškai | Komentaras |
| --- | --- | --- |
| 1 | 1/1 | Teisingai. |
| 2 | 1/1 | Teisingai. |
| 3 | 1/1 | Teisingai. |
| 4 | 1/1 | Teisingai. |
| 5 | 1/1 | Teisingai. |
| 6 | 1/1 | Teisingai. |
| 7 | 1.5/2 | Nenurodyti matavimo vienetai. |
| 8 | 1.5/2 | Nenurodyti matavimo vienetai. |
| 9a | 1.5/2 | Nenurodyti matavimo vienetai. |
| 9b | 2/2 | Teisingai. |
| 9c | 2/2 | Teisingai. |
| **Iš viso** | **14.5/16** | **Pažymys: 9** |$grade_md$),
  ('1E', 'Važnevičiūtė Evita', $grade_md$### Mokinys: Važnevičiūtė Evita

Klasė: 1E
Variantas: I
Taškai: 14.5/16
Pažymys: 9

| Užduotis | Taškai | Komentaras |
| --- | --- | --- |
| 1 | 1/1 | Teisingai. |
| 2 | 0/1 | Teisingas atsakymas: D |
| 3 | 1/1 | Teisingai. |
| 4 | 1/1 | Teisingai. |
| 5 | 1/1 | Teisingai. |
| 6 | 1/1 | Teisingai. |
| 7 | 1.5/2 | Neteisingai nurodyti matavimo vienetai. |
| 8 | 2/2 | Teisingai. |
| 9a | 2/2 | Teisingai. |
| 9b | 2/2 | Teisingai. |
| 9c | 2/2 | Teisingai. |
| **Iš viso** | **14.5/16** | **Pažymys: 9** |$grade_md$),
  ('1E', 'Petrauskaitė Žyginta', $grade_md$### Mokinys: Petrauskaitė Žyginta

Klasė: 1E
Variantas: I
Taškai: 7/16
Pažymys: 5

| Užduotis | Taškai | Komentaras |
| --- | --- | --- |
| 1 | 1/1 | Teisingai. |
| 2 | 1/1 | Teisingai. |
| 3 | 1/1 | Teisingai. |
| 4 | 1/1 | Teisingai. |
| 5 | 1/1 | Teisingai. |
| 6 | 0/1 | Teisingas atsakymas: B |
| 7 | 2/2 | Teisingai. |
| 8 | 0/2 | Neteisingai parinkta formulė. |
| 9a | 0/2 | Neteisingai panaudoti užduoties duomenys. |
| 9b | 0/2 | Užduoties dalis neišspręsta. |
| 9c | 0/2 | Užduoties dalis neišspręsta. |
| **Iš viso** | **7/16** | **Pažymys: 5** |$grade_md$),
  ('1E', 'Raizgys Adas', $grade_md$### Mokinys: Raizgys Adas

Klasė: 1E
Variantas: I
Taškai: 5/16
Pažymys: 4

| Užduotis | Taškai | Komentaras |
| --- | --- | --- |
| 1 | 1/1 | Teisingai. |
| 2 | 0/1 | Teisingas atsakymas: D |
| 3 | 1/1 | Teisingai. |
| 4 | 1/1 | Teisingai. |
| 5 | 1/1 | Teisingai. |
| 6 | 1/1 | Teisingai. |
| 7 | 0/2 | Neteisingai parinkta formulė. |
| 8 | 0/2 | Sprendimas nebaigtas. |
| 9a | 0/2 | Užduoties dalis neišspręsta. |
| 9b | 0/2 | Užduoties dalis neišspręsta. |
| 9c | 0/2 | Užduoties dalis neišspręsta. |
| **Iš viso** | **5/16** | **Pažymys: 4** |$grade_md$),
  ('1E', 'Rusteikaitė Mėta', $grade_md$### Mokinys: Rusteikaitė Mėta

Klasė: 1E
Variantas: I
Taškai: 4/16
Pažymys: 3

| Užduotis | Taškai | Komentaras |
| --- | --- | --- |
| 1 | 0/1 | Teisingas atsakymas: C |
| 2 | 0/1 | Teisingas atsakymas: D |
| 3 | 1/1 | Teisingai. |
| 4 | 0/1 | Teisingas atsakymas: C |
| 5 | 1/1 | Teisingai. |
| 6 | 1/1 | Teisingai. |
| 7 | 1/2 | Sprendimas nebaigtas. |
| 8 | 0/2 | Nenurodyta reikalinga formulė. |
| 9a | 0/2 | Nenurodyta reikalinga formulė. |
| 9b | 0/2 | Užduoties dalis neišspręsta. |
| 9c | 0/2 | Užduoties dalis neišspręsta. |
| **Iš viso** | **4/16** | **Pažymys: 3** |$grade_md$),
  ('1E', 'Kriaučiūnaitė Milena', $grade_md$### Mokinys: Kriaučiūnaitė Milena

Klasė: 1E
Variantas: I
Taškai: 11/16
Pažymys: 7

| Užduotis | Taškai | Komentaras |
| --- | --- | --- |
| 1 | 0/1 | Teisingas atsakymas: C |
| 2 | 0/1 | Teisingas atsakymas: D |
| 3 | 1/1 | Teisingai. |
| 4 | 1/1 | Teisingai. |
| 5 | 0/1 | Teisingas atsakymas: D |
| 6 | 1/1 | Teisingai. |
| 7 | 2/2 | Teisingai. |
| 8 | 2/2 | Teisingai. |
| 9a | 2/2 | Teisingai. |
| 9b | 0/2 | Neatsakyta į dalį užduoties. |
| 9c | 2/2 | Teisingai. |
| **Iš viso** | **11/16** | **Pažymys: 7** |$grade_md$),
  ('1E', 'Mickutė Nerilė', $grade_md$### Mokinys: Mickutė Nerilė

Klasė: 1E
Variantas: I
Taškai: 3/16
Pažymys: 2

| Užduotis | Taškai | Komentaras |
| --- | --- | --- |
| 1 | 0/1 | Teisingas atsakymas: C |
| 2 | 0/1 | Teisingas atsakymas: D |
| 3 | 1/1 | Teisingai. |
| 4 | 1/1 | Teisingai. |
| 5 | 0/1 | Teisingas atsakymas: D |
| 6 | 1/1 | Teisingai. |
| 7 | 0/2 | Apskaičiuotas ne tas fizikinis dydis. |
| 8 | 0/2 | Apskaičiuotas ne tas fizikinis dydis. |
| 9a | 0/2 | Neteisingai panaudoti užduoties duomenys. |
| 9b | 0/2 | Neteisingai panaudoti užduoties duomenys. |
| 9c | 0/2 | Užduoties dalis neišspręsta. |
| **Iš viso** | **3/16** | **Pažymys: 2** |$grade_md$),
  ('1F', 'Kaziukevičius Deividas', $grade_md$### Mokinys: Kaziukevičius Deividas

Klasė: 1F
Variantas: II
Taškai: 4/16
Pažymys: 3

|    Užduotis |   Taškai | Komentaras                                                  |
| -----------: | --------: | ----------------------------------------------------------- |
|           1 |      1/1 | Teisingas atsakymas: D                                      |
|           2 |      0/1 | Teisingas atsakymas: B                                      |
|           3 |      0/1 | Teisingas atsakymas: B                                      |
|           4 |      1/1 | Teisingas atsakymas: A                                      |
|           5 |      0/1 | Teisingas atsakymas: A                                      |
|           6 |      0/1 | Teisingas atsakymas: B                                      |
|           7 |      0/2 | Nenurodyta reikalinga formulė.                              |
|           8 |      1/2 | Skaičiavimo klaida.                                         |
|          9a |      1/2 | Neteisingai panaudoti užduoties duomenys.                   |
|          9b |      0/2 | Apskaičiuota tik panirusios dalies masė, ne visa kūno masė. |
|          9c |      0/2 | Užduoties dalis neišspręsta.                                |
| **Iš viso** | **4/16** | **Pažymys: 3**                                              |$grade_md$),
  ('1F', 'Vilionis Erikas', $grade_md$### Mokinys: Vilionis Erikas

Klasė: 1F
Variantas: II
Taškai: 15/16
Pažymys: 10

|    Užduotis |    Taškai | Komentaras             |
| -----------: | ---------: | ---------------------- |
|           1 |       1/1 | Teisingas atsakymas: D |
|           2 |       1/1 | Teisingas atsakymas: B |
|           3 |       1/1 | Teisingas atsakymas: B |
|           4 |       1/1 | Teisingas atsakymas: A |
|           5 |       0/1 | Teisingas atsakymas: A |
|           6 |       1/1 | Teisingas atsakymas: B |
|           7 |       2/2 | Teisingai.             |
|           8 |       2/2 | Teisingai.             |
|          9a |       2/2 | Teisingai.             |
|          9b |       2/2 | Teisingai.             |
|          9c |       2/2 | Teisingai.             |
| **Iš viso** | **15/16** | **Pažymys: 10**        |$grade_md$),
  ('1F', 'Pletaitė Mėta', $grade_md$### Mokinys: Pletaitė Mėta

Klasė: 1F
Variantas: II
Taškai: 12/16
Pažymys: 8

|    Užduotis |    Taškai | Komentaras                                                                                                   |
| -----------: | ---------: | ------------------------------------------------------------------------------------------------------------ |
|           1 |       1/1 | Teisingas atsakymas: D                                                                                       |
|           2 |       0/1 | Teisingas atsakymas: B                                                                                       |
|           3 |       1/1 | Teisingas atsakymas: B                                                                                       |
|           4 |       1/1 | Teisingas atsakymas: A                                                                                       |
|           5 |       1/1 | Teisingas atsakymas: A                                                                                       |
|           6 |       1/1 | Teisingas atsakymas: B                                                                                       |
|           7 |       2/2 | Teisingai.                                                                                                   |
|           8 |       2/2 | Teisingai.                                                                                                   |
|          9a |       2/2 | Teisingai.                                                                                                   |
|          9b |       0/2 | Neteisingai parinkta formulė.; Neteisingai panaudoti užduoties duomenys.; Išbrauktas teisingas atsakymas.    |
|          9c |       1/2 | Neteisingai įstatytos reikšmės į formulę.; Išbrauktas teisingas atsakymas.; Neteisingas galutinis atsakymas. |
| **Iš viso** | **12/16** | **Pažymys: 8**                                                                                               |$grade_md$),
  ('1F', 'Klišauskaitė Gustė', $grade_md$### Mokinys: Klišauskaitė Gustė

Klasė: 1F
Variantas: II
Taškai: 5/16
Pažymys: 4

|    Užduotis |   Taškai | Komentaras                                                                  |
| -----------: | --------: | --------------------------------------------------------------------------- |
|           1 |      1/1 | Teisingas atsakymas: D                                                      |
|           2 |      0/1 | Teisingas atsakymas: B                                                      |
|           3 |      0/1 | Teisingas atsakymas: B                                                      |
|           4 |      0/1 | Teisingas atsakymas: A                                                      |
|           5 |      0/1 | Teisingas atsakymas: A                                                      |
|           6 |      1/1 | Teisingas atsakymas: B                                                      |
|           7 |      2/2 | Teisingai.                                                                  |
|           8 |      0/2 | Sprendimo eiga neparodyta.<br>Nepateiktas galutinis atsakymas.              |
|          9a |      1/2 | Neteisingai panaudoti užduoties duomenys.; Neteisingas galutinis atsakymas. |
|          9b |      0/2 | Neteisingai parinkta formulė.; Neteisingas galutinis atsakymas.             |
|          9c |      0/2 | Neteisingai parinkta formulė.; Neteisingas galutinis atsakymas.             |
| **Iš viso** | **5/16** | **Pažymys: 4**                                                              |$grade_md$),
  ('1F', 'Karaliūnaitė Aurelija', $grade_md$### Mokinys: Karaliūnaitė Aurelija

Klasė: 1F
Variantas: II
Taškai: 9/16
Pažymys: 6

|    Užduotis |   Taškai | Komentaras                                                  |
| -----------: | --------: | ----------------------------------------------------------- |
|           1 |      1/1 | Teisingas atsakymas: D                                      |
|           2 |      0/1 | Teisingas atsakymas: B                                      |
|           3 |      0/1 | Teisingas atsakymas: B                                      |
|           4 |      1/1 | Teisingas atsakymas: A                                      |
|           5 |      0/1 | Teisingas atsakymas: A                                      |
|           6 |      0/1 | Teisingas atsakymas: B                                      |
|           7 |      2/2 | Teisingai.                                                  |
|           8 |      1/2 | Sprendimas nebaigtas.<br>Neteisingas galutinis atsakymas.   |
|          9a |      2/2 | Teisingai.                                                  |
|          9b |      0/2 | Apskaičiuota tik panirusios dalies masė, ne visa kūno masė. |
|          9c |      2/2 | Teisingai.                                                  |
| **Iš viso** | **9/16** | **Pažymys: 6**                                              |$grade_md$),
  ('1F', 'Lomotis Damir', $grade_md$### Mokinys: Lomotis Damir

Klasė: 1F
Variantas: II
Taškai: 14/16
Pažymys: 9

|    Užduotis |    Taškai | Komentaras             |
| -----------: | ---------: | ---------------------- |
|           1 |       1/1 | Teisingas atsakymas: D |
|           2 |       0/1 | Teisingas atsakymas: B |
|           3 |       1/1 | Teisingas atsakymas: B |
|           4 |       0/1 | Teisingas atsakymas: A |
|           5 |       1/1 | Teisingas atsakymas: A |
|           6 |       1/1 | Teisingas atsakymas: B |
|           7 |       2/2 | Teisingai.             |
|           8 |       2/2 | Teisingai.             |
|          9a |       2/2 | Teisingai.             |
|          9b |       2/2 | Teisingai.             |
|          9c |       2/2 | Teisingai.             |
| **Iš viso** | **14/16** | **Pažymys: 9**         |$grade_md$),
  ('1F', 'Rževskytė Urtė', $grade_md$### Mokinys: Rževskytė Urtė

Klasė: 1F
Variantas: II
Taškai: 6/16
Pažymys: 5

|    Užduotis |   Taškai | Komentaras                                                                                                          |
| -----------: | --------: | ------------------------------------------------------------------------------------------------------------------- |
|           1 |      1/1 | Teisingas atsakymas: D                                                                                              |
|           2 |      0/1 | Teisingas atsakymas: B                                                                                              |
|           3 |      0/1 | Teisingas atsakymas: B                                                                                              |
|           4 |      0/1 | Teisingas atsakymas: A                                                                                              |
|           5 |      0/1 | Teisingas atsakymas: A                                                                                              |
|           6 |      1/1 | Teisingas atsakymas: B                                                                                              |
|           7 |      2/2 | Teisingai.                                                                                                          |
|           8 |      1/2 | Neteisingai panaudoti užduoties duomenys.<br>Klaida keičiant matavimo vienetus.<br>Neteisingas galutinis atsakymas. |
|          9a |      1/2 | Neteisingai panaudoti užduoties duomenys.; Neteisingas galutinis atsakymas.                                         |
|          9b |      0/2 | Užduoties dalis neišspręsta.                                                                                        |
|          9c |      0/2 | Neteisingai panaudoti užduoties duomenys.; Neteisingas galutinis atsakymas.                                         |
| **Iš viso** | **6/16** | **Pažymys: 5**                                                                                                      |$grade_md$),
  ('1F', 'Druskinytė Saulė', $grade_md$### Mokinys: Druskinytė Saulė

Klasė: 1F
Variantas: II
Taškai: 12/16
Pažymys: 8

|    Užduotis |    Taškai | Komentaras                                                                                                                              |
| -----------: | ---------: | --------------------------------------------------------------------------------------------------------------------------------------- |
|           1 |       1/1 | Teisingas atsakymas: D                                                                                                                  |
|           2 |       0/1 | Teisingas atsakymas: B                                                                                                                  |
|           3 |       1/1 | Teisingas atsakymas: B                                                                                                                  |
|           4 |       1/1 | Teisingas atsakymas: A                                                                                                                  |
|           5 |       1/1 | Teisingas atsakymas: A                                                                                                                  |
|           6 |       1/1 | Teisingas atsakymas: B                                                                                                                  |
|           7 |       2/2 | Teisingai.                                                                                                                              |
|           8 |       2/2 | Teisingai.                                                                                                                              |
|          9a |       1/2 | Neteisingai panaudoti užduoties duomenys.; Neteisingas galutinis atsakymas.                                                             |
|          9b |       2/2 | Galutinis atsakymas neteisingas, nes naudotas ankstesnėje dalyje gautas rezultatas, bet sprendimo eiga teisinga, todėl taškai skiriami. |
|          9c |       0/2 | Neteisingai parinkta formulė.; Neteisingai panaudoti užduoties duomenys.; Neteisingas galutinis atsakymas.                              |
| **Iš viso** | **12/16** | **Pažymys: 8**                                                                                                                          |$grade_md$),
  ('1F', 'Pareigytė Urtė', $grade_md$### Mokinys: Pareigytė Urtė

Klasė: 1F
Variantas: II
Taškai: 10/16
Pažymys: 7

|    Užduotis |    Taškai | Komentaras                                                                    |
| -----------: | ---------: | ----------------------------------------------------------------------------- |
|           1 |       1/1 | Teisingas atsakymas: D                                                        |
|           2 |       1/1 | Teisingas atsakymas: B                                                        |
|           3 |       1/1 | Teisingas atsakymas: B                                                        |
|           4 |       0/1 | Teisingas atsakymas: A                                                        |
|           5 |       1/1 | Teisingas atsakymas: A                                                        |
|           6 |       1/1 | Teisingas atsakymas: B                                                        |
|           7 |       1/2 | Neteisingai panaudoti užduoties duomenys.<br>Neteisingas galutinis atsakymas. |
|           8 |       2/2 | Teisingai.                                                                    |
|          9a |       2/2 | Teisingai.                                                                    |
|          9b |       0/2 | Apskaičiuota tik panirusios dalies masė, ne visa kūno masė.                   |
|          9c |       0/2 | Užduoties dalis neišspręsta.                                                  |
| **Iš viso** | **10/16** | **Pažymys: 7**                                                                |$grade_md$),
  ('1F', 'Bieliūnaitė Milda', $grade_md$### Mokinys: Bieliūnaitė Milda

Klasė: 1F
Variantas: II
Taškai: 15/16
Pažymys: 10

|    Užduotis |    Taškai | Komentaras             |
| -----------: | ---------: | ---------------------- |
|           1 |       1/1 | Teisingas atsakymas: D |
|           2 |       0/1 | Teisingas atsakymas: B |
|           3 |       1/1 | Teisingas atsakymas: B |
|           4 |       1/1 | Teisingas atsakymas: A |
|           5 |       1/1 | Teisingas atsakymas: A |
|           6 |       1/1 | Teisingas atsakymas: B |
|           7 |       2/2 | Teisingai.             |
|           8 |       2/2 | Teisingai.             |
|          9a |       2/2 | Teisingai.             |
|          9b |       2/2 | Teisingai.             |
|          9c |       2/2 | Teisingai.             |
| **Iš viso** | **15/16** | **Pažymys: 10**        |$grade_md$),
  ('1F', 'Ananikovaitė Augustė', $grade_md$### Mokinys: Ananikovaitė Augustė

Klasė: 1F
Variantas: II
Taškai: 15/16
Pažymys: 10

|    Užduotis |    Taškai | Komentaras             |
| -----------: | ---------: | ---------------------- |
|           1 |       1/1 | Teisingas atsakymas: D |
|           2 |       0/1 | Teisingas atsakymas: B |
|           3 |       1/1 | Teisingas atsakymas: B |
|           4 |       1/1 | Teisingas atsakymas: A |
|           5 |       1/1 | Teisingas atsakymas: A |
|           6 |       1/1 | Teisingas atsakymas: B |
|           7 |       2/2 | Teisingai.             |
|           8 |       2/2 | Teisingai.             |
|          9a |       2/2 | Teisingai.             |
|          9b |       2/2 | Teisingai.             |
|          9c |       2/2 | Teisingai.             |
| **Iš viso** | **15/16** | **Pažymys: 10**        |$grade_md$),
  ('1F', 'Kižytė Gabrielė', $grade_md$### Mokinys: Kižytė Gabrielė

Klasė: 1F
Variantas: II
Taškai: 15/16
Pažymys: 10

|    Užduotis |    Taškai | Komentaras             |
| -----------: | ---------: | ---------------------- |
|           1 |       1/1 | Teisingas atsakymas: D |
|           2 |       0/1 | Teisingas atsakymas: B |
|           3 |       1/1 | Teisingas atsakymas: B |
|           4 |       1/1 | Teisingas atsakymas: A |
|           5 |       1/1 | Teisingas atsakymas: A |
|           6 |       1/1 | Teisingas atsakymas: B |
|           7 |       2/2 | Teisingai.             |
|           8 |       2/2 | Teisingai.             |
|          9a |       2/2 | Teisingai.             |
|          9b |       2/2 | Teisingai.             |
|          9c |       2/2 | Teisingai.             |
| **Iš viso** | **15/16** | **Pažymys: 10**        |$grade_md$),
  ('1F', 'Šavdianis Mykolas', $grade_md$### Mokinys: Šavdianis Mykolas

Klasė: 1F
Variantas: II
Taškai: 5/16
Pažymys: 4

|    Užduotis |   Taškai | Komentaras                                                        |
| -----------: | --------: | ----------------------------------------------------------------- |
|           1 |      0/1 | Teisingas atsakymas: D                                            |
|           2 |      1/1 | Teisingas atsakymas: B                                            |
|           3 |      0/1 | Teisingas atsakymas: B                                            |
|           4 |      1/1 | Teisingas atsakymas: A                                            |
|           5 |      1/1 | Teisingas atsakymas: A                                            |
|           6 |      1/1 | Teisingas atsakymas: B                                            |
|           7 |      1/2 | Skaičiavimo klaida.<br>Neteisingas galutinis atsakymas.           |
|           8 |      0/2 | Neteisingai parinkta formulė.<br>Neteisingas galutinis atsakymas. |
|          9a |      0/2 | Užduoties dalis neišspręsta.                                      |
|          9b |      0/2 | Užduoties dalis neišspręsta.                                      |
|          9c |      0/2 | Užduoties dalis neišspręsta.                                      |
| **Iš viso** | **5/16** | **Pažymys: 4**                                                    |$grade_md$),
  ('1F', 'Jurkevičius Joris', $grade_md$### Mokinys: Jurkevičius Joris

Klasė: 1F
Variantas: I
Taškai: 14/16
Pažymys: 9

|    Užduotis |    Taškai | Komentaras             |
| -----------: | ---------: | ---------------------- |
|           1 |       1/1 | Teisingas atsakymas: C |
|           2 |       1/1 | Teisingas atsakymas: D |
|           3 |       0/1 | Teisingas atsakymas: B |
|           4 |       0/1 | Teisingas atsakymas: C |
|           5 |       1/1 | Teisingas atsakymas: D |
|           6 |       1/1 | Teisingas atsakymas: B |
|           7 |       2/2 | Teisingai.             |
|           8 |       2/2 | Teisingai.             |
|          9a |       2/2 | Teisingai.             |
|          9b |       2/2 | Teisingai.             |
|          9c |       2/2 | Teisingai.             |
| **Iš viso** | **14/16** | **Pažymys: 9**         |$grade_md$),
  ('1F', 'Savickas Vytautas', $grade_md$### Mokinys: Savickas Vytautas

Klasė: 1F
Variantas: I
Taškai: 16/16
Pažymys: 10

|    Užduotis |    Taškai | Komentaras             |
| -----------: | ---------: | ---------------------- |
|           1 |       1/1 | Teisingas atsakymas: C |
|           2 |       1/1 | Teisingas atsakymas: D |
|           3 |       1/1 | Teisingas atsakymas: B |
|           4 |       1/1 | Teisingas atsakymas: C |
|           5 |       1/1 | Teisingas atsakymas: D |
|           6 |       1/1 | Teisingas atsakymas: B |
|           7 |       2/2 | Teisingai.             |
|           8 |       2/2 | Teisingai.             |
|          9a |       2/2 | Teisingai.             |
|          9b |       2/2 | Teisingai.             |
|          9c |       2/2 | Teisingai.             |
| **Iš viso** | **16/16** | **Pažymys: 10**        |$grade_md$),
  ('1F', 'Mozolis Mantas', $grade_md$### Mokinys: Mozolis Mantas

Klasė: 1F
Variantas: I
Taškai: 10/16
Pažymys: 7

|    Užduotis |    Taškai | Komentaras                                                      |
| -----------: | ---------: | --------------------------------------------------------------- |
|           1 |       1/1 | Teisingas atsakymas: C                                          |
|           2 |       0/1 | Teisingas atsakymas: D                                          |
|           3 |       1/1 | Teisingas atsakymas: B                                          |
|           4 |       1/1 | Teisingas atsakymas: C                                          |
|           5 |       1/1 | Teisingas atsakymas: D                                          |
|           6 |       0/1 | Teisingas atsakymas: B                                          |
|           7 |       2/2 | Teisingai.                                                      |
|           8 |       2/2 | Teisingai.                                                      |
|          9a |       0/2 | Neteisingai parinkta formulė.; Neteisingas galutinis atsakymas. |
|          9b |       2/2 | Teisingai.                                                      |
|          9c |       0/2 | Neteisingai parinkta formulė.; Neteisingas galutinis atsakymas. |
| **Iš viso** | **10/16** | **Pažymys: 7**                                                  |$grade_md$),
  ('1F', 'Šapovalovaitė Emilija', $grade_md$### Mokinys: Šapovalovaitė Emilija

Klasė: 1F
Variantas: I
Taškai: 16/16
Pažymys: 10

|    Užduotis |    Taškai | Komentaras             |
| -----------: | ---------: | ---------------------- |
|           1 |       1/1 | Teisingas atsakymas: C |
|           2 |       1/1 | Teisingas atsakymas: D |
|           3 |       1/1 | Teisingas atsakymas: B |
|           4 |       1/1 | Teisingas atsakymas: C |
|           5 |       1/1 | Teisingas atsakymas: D |
|           6 |       1/1 | Teisingas atsakymas: B |
|           7 |       2/2 | Teisingai.             |
|           8 |       2/2 | Teisingai.             |
|          9a |       2/2 | Teisingai.             |
|          9b |       2/2 | Teisingai.             |
|          9c |       2/2 | Teisingai.             |
| **Iš viso** | **16/16** | **Pažymys: 10**        |$grade_md$),
  ('1F', 'Kisieliūtė Aistė', $grade_md$### Mokinys: Kisieliūtė Aistė

Klasė: 1F
Variantas: II
Taškai: 7/16
Pažymys: 5

|    Užduotis |   Taškai | Komentaras                                                                                                 |
| -----------: | --------: | ---------------------------------------------------------------------------------------------------------- |
|           1 |      1/1 | Teisingas atsakymas: D                                                                                     |
|           2 |      1/1 | Teisingas atsakymas: B                                                                                     |
|           3 |      1/1 | Teisingas atsakymas: B                                                                                     |
|           4 |      0/1 | Teisingas atsakymas: A                                                                                     |
|           5 |      0/1 | Teisingas atsakymas: A                                                                                     |
|           6 |      0/1 | Teisingas atsakymas: B                                                                                     |
|           7 |      2/2 | Teisingai.                                                                                                 |
|           8 |      1/2 | Neatsakyta į dalį užduoties.<br>Nepateiktas galutinis atsakymas.                                           |
|          9a |      0/2 | Neteisingai parinkta formulė.; Neteisingai panaudoti užduoties duomenys.; Neteisingas galutinis atsakymas. |
|          9b |      0/2 | Apskaičiuotas ne tas fizikinis dydis.; Neteisingai parinkta formulė.; Neteisingas galutinis atsakymas.     |
|          9c |      1/2 | Neteisingai panaudoti užduoties duomenys.; Neteisingas galutinis atsakymas.                                |
| **Iš viso** | **7/16** | **Pažymys: 5**                                                                                             |$grade_md$),
  ('1F', 'Grybauskaitė Karolina', $grade_md$### Mokinys: Grybauskaitė Karolina

Klasė: 1F
Variantas: I
Taškai: 12/16
Pažymys: 8

|    Užduotis |    Taškai | Komentaras             |
| -----------: | ---------: | ---------------------- |
|           1 |       1/1 | Teisingas atsakymas: C |
|           2 |       0/1 | Teisingas atsakymas: D |
|           3 |       0/1 | Teisingas atsakymas: B |
|           4 |       1/1 | Teisingas atsakymas: C |
|           5 |       0/1 | Teisingas atsakymas: D |
|           6 |       0/1 | Teisingas atsakymas: B |
|           7 |       2/2 | Teisingai.             |
|           8 |       2/2 | Teisingai.             |
|          9a |       2/2 | Teisingai.             |
|          9b |       2/2 | Teisingai.             |
|          9c |       2/2 | Teisingai.             |
| **Iš viso** | **12/16** | **Pažymys: 8**         |$grade_md$),
  ('1F', 'Vanagaitė Gabija', $grade_md$### Mokinys: Vanagaitė Gabija

Klasė: 1F
Variantas: I
Taškai: 6/16
Pažymys: 5

|    Užduotis |   Taškai | Komentaras                                                             |
| -----------: | --------: | ---------------------------------------------------------------------- |
|           1 |      0/1 | Teisingas atsakymas: C                                                 |
|           2 |      0/1 | Teisingas atsakymas: D                                                 |
|           3 |      1/1 | Teisingas atsakymas: B                                                 |
|           4 |      1/1 | Teisingas atsakymas: C                                                 |
|           5 |      1/1 | Teisingas atsakymas: D                                                 |
|           6 |      0/1 | Teisingas atsakymas: B                                                 |
|           7 |      2/2 | Teisingai.                                                             |
|           8 |      1/2 | Klaida keičiant matavimo vienetus.<br>Neteisingas galutinis atsakymas. |
|          9a |      0/2 | Neteisingai parinkta formulė.; Neteisingas galutinis atsakymas.        |
|          9b |      0/2 | Neteisingai parinkta formulė.; Neteisingas galutinis atsakymas.        |
|          9c |      0/2 | Užduoties dalis neišspręsta.                                           |
| **Iš viso** | **6/16** | **Pažymys: 5**                                                         |$grade_md$),
  ('1F', 'Pilkaitė Patricija', $grade_md$### Mokinys: Pilkaitė Patricija

Klasė: 1F
Variantas: I
Taškai: 11/16
Pažymys: 7

|    Užduotis |    Taškai | Komentaras                                                                                                                              |
| -----------: | ---------: | --------------------------------------------------------------------------------------------------------------------------------------- |
|           1 |       1/1 | Teisingas atsakymas: C                                                                                                                  |
|           2 |       0/1 | Teisingas atsakymas: D                                                                                                                  |
|           3 |       0/1 | Teisingas atsakymas: B                                                                                                                  |
|           4 |       1/1 | Teisingas atsakymas: C                                                                                                                  |
|           5 |       1/1 | Teisingas atsakymas: D                                                                                                                  |
|           6 |       0/1 | Teisingas atsakymas: B                                                                                                                  |
|           7 |       2/2 | Teisingai.                                                                                                                              |
|           8 |       1/2 | Klaida keičiant matavimo vienetus.<br>Neteisingas galutinis atsakymas.                                                                  |
|          9a |       1/2 | Neteisingai panaudoti užduoties duomenys.; Neteisingas galutinis atsakymas.                                                             |
|          9b |       2/2 | Teisingai.                                                                                                                              |
|          9c |       2/2 | Galutinis atsakymas neteisingas, nes naudotas ankstesnėje dalyje gautas rezultatas, bet sprendimo eiga teisinga, todėl taškai skiriami. |
| **Iš viso** | **11/16** | **Pažymys: 7**                                                                                                                          |$grade_md$),
  ('1F', 'Katkutė Silvija', $grade_md$### Mokinys: Katkutė Silvija

Klasė: 1F
Variantas: I
Taškai: 16/16
Pažymys: 10

|    Užduotis |    Taškai | Komentaras             |
| -----------: | ---------: | ---------------------- |
|           1 |       1/1 | Teisingas atsakymas: C |
|           2 |       1/1 | Teisingas atsakymas: D |
|           3 |       1/1 | Teisingas atsakymas: B |
|           4 |       1/1 | Teisingas atsakymas: C |
|           5 |       1/1 | Teisingas atsakymas: D |
|           6 |       1/1 | Teisingas atsakymas: B |
|           7 |       2/2 | Teisingai.             |
|           8 |       2/2 | Teisingai.             |
|          9a |       2/2 | Teisingai.             |
|          9b |       2/2 | Teisingai.             |
|          9c |       2/2 | Teisingai.             |
| **Iš viso** | **16/16** | **Pažymys: 10**        |$grade_md$),
  ('1F', 'Nagurnaitė Simona', $grade_md$### Mokinys: Nagurnaitė Simona

Klasė: 1F
Variantas: I
Taškai: 16/16
Pažymys: 10

|    Užduotis |    Taškai | Komentaras             |
| -----------: | ---------: | ---------------------- |
|           1 |       1/1 | Teisingas atsakymas: C |
|           2 |       1/1 | Teisingas atsakymas: D |
|           3 |       1/1 | Teisingas atsakymas: B |
|           4 |       1/1 | Teisingas atsakymas: C |
|           5 |       1/1 | Teisingas atsakymas: D |
|           6 |       1/1 | Teisingas atsakymas: B |
|           7 |       2/2 | Teisingai.             |
|           8 |       2/2 | Teisingai.             |
|          9a |       2/2 | Teisingai.             |
|          9b |       2/2 | Teisingai.             |
|          9c |       2/2 | Teisingai.             |
| **Iš viso** | **16/16** | **Pažymys: 10**        |$grade_md$),
  ('1F', 'Baigytė Mingailė', $grade_md$### Mokinys: Baigytė Mingailė

Klasė: 1F
Variantas: I
Taškai: 15/16
Pažymys: 10

|    Užduotis |    Taškai | Komentaras                                                                                                                              |
| -----------: | ---------: | --------------------------------------------------------------------------------------------------------------------------------------- |
|           1 |       1/1 | Teisingas atsakymas: C                                                                                                                  |
|           2 |       1/1 | Teisingas atsakymas: D                                                                                                                  |
|           3 |       1/1 | Teisingas atsakymas: B                                                                                                                  |
|           4 |       1/1 | Teisingas atsakymas: C                                                                                                                  |
|           5 |       1/1 | Teisingas atsakymas: D                                                                                                                  |
|           6 |       1/1 | Teisingas atsakymas: B                                                                                                                  |
|           7 |       2/2 | Teisingai.                                                                                                                              |
|           8 |       2/2 | Teisingai.                                                                                                                              |
|          9a |       1/2 | Neteisingai panaudoti užduoties duomenys.; Neteisingas galutinis atsakymas.                                                             |
|          9b |       2/2 | Galutinis atsakymas neteisingas, nes naudotas ankstesnėje dalyje gautas rezultatas, bet sprendimo eiga teisinga, todėl taškai skiriami. |
|          9c |       2/2 | Galutinis atsakymas neteisingas, nes naudotas ankstesnėje dalyje gautas rezultatas, bet sprendimo eiga teisinga, todėl taškai skiriami. |
| **Iš viso** | **15/16** | **Pažymys: 10**                                                                                                                         |$grade_md$),
  ('1F', 'Auželytė Gintarė', $grade_md$### Mokinys: Auželytė Gintarė

Klasė: 1F
Variantas: I
Taškai: 15/16
Pažymys: 10

|    Užduotis |    Taškai | Komentaras             |
| -----------: | ---------: | ---------------------- |
|           1 |       0/1 | Teisingas atsakymas: C |
|           2 |       1/1 | Teisingas atsakymas: D |
|           3 |       1/1 | Teisingas atsakymas: B |
|           4 |       1/1 | Teisingas atsakymas: C |
|           5 |       1/1 | Teisingas atsakymas: D |
|           6 |       1/1 | Teisingas atsakymas: B |
|           7 |       2/2 | Teisingai.             |
|           8 |       2/2 | Teisingai.             |
|          9a |       2/2 | Teisingai.             |
|          9b |       2/2 | Teisingai.             |
|          9c |       2/2 | Teisingai.             |
| **Iš viso** | **15/16** | **Pažymys: 10**        |$grade_md$),
  ('1F', 'Leščinskaitė Arvilė', $grade_md$### Mokinys: Leščinskaitė Arvilė

Klasė: 1F
Variantas: I
Taškai: 13.5/16
Pažymys: 8

|    Užduotis |      Taškai | Komentaras                              |
| -----------: | -----------: | --------------------------------------- |
|           1 |         1/1 | Teisingas atsakymas: C                  |
|           2 |         1/1 | Teisingas atsakymas: D                  |
|           3 |         1/1 | Teisingas atsakymas: B                  |
|           4 |         1/1 | Teisingas atsakymas: C                  |
|           5 |         1/1 | Teisingas atsakymas: D                  |
|           6 |         0/1 | Teisingas atsakymas: B                  |
|           7 |         2/2 | Teisingai.                              |
|           8 |         2/2 | Teisingai.                              |
|          9a |       1.5/2 | Neteisingai nurodyti matavimo vienetai. |
|          9b |       1.5/2 | Nenurodyti matavimo vienetai.           |
|          9c |       1.5/2 | Nenurodyti matavimo vienetai.           |
| **Iš viso** | **13.5/16** | **Pažymys: 8**                          |$grade_md$),
  ('1F', 'Zataveckaitė Judrė', $grade_md$### Mokinys: Zataveckaitė Judrė

Klasė: 1F
Variantas: I
Taškai: 15/16
Pažymys: 10

|    Užduotis |    Taškai | Komentaras             |
| -----------: | ---------: | ---------------------- |
|           1 |       0/1 | Teisingas atsakymas: C |
|           2 |       1/1 | Teisingas atsakymas: D |
|           3 |       1/1 | Teisingas atsakymas: B |
|           4 |       1/1 | Teisingas atsakymas: C |
|           5 |       1/1 | Teisingas atsakymas: D |
|           6 |       1/1 | Teisingas atsakymas: B |
|           7 |       2/2 | Teisingai.             |
|           8 |       2/2 | Teisingai.             |
|          9a |       2/2 | Teisingai.             |
|          9b |       2/2 | Teisingai.             |
|          9c |       2/2 | Teisingai.             |
| **Iš viso** | **15/16** | **Pažymys: 10**        |$grade_md$),
  ('1F', 'Augulytė Emilija', $grade_md$### Mokinys: Augulytė Emilija

Klasė: 1F
Variantas: I
Taškai: 13/16
Pažymys: 8

|    Užduotis |    Taškai | Komentaras             |
| -----------: | ---------: | ---------------------- |
|           1 |       1/1 | Teisingas atsakymas: C |
|           2 |       1/1 | Teisingas atsakymas: D |
|           3 |       0/1 | Teisingas atsakymas: B |
|           4 |       0/1 | Teisingas atsakymas: C |
|           5 |       1/1 | Teisingas atsakymas: D |
|           6 |       0/1 | Teisingas atsakymas: B |
|           7 |       2/2 | Teisingai.             |
|           8 |       2/2 | Teisingai.             |
|          9a |       2/2 | Teisingai.             |
|          9b |       2/2 | Teisingai.             |
|          9c |       2/2 | Teisingai.             |
| **Iš viso** | **13/16** | **Pažymys: 8**         |$grade_md$),
  ('1F', 'Didžiokas Norbertas', $grade_md$### Mokinys: Didžiokas Norbertas

Klasė: 1F
Variantas: I
Taškai: 3/16
Pažymys: 2

|    Užduotis |   Taškai | Komentaras                                                                                                  |
| -----------: | --------: | ----------------------------------------------------------------------------------------------------------- |
|           1 |      1/1 | Teisingas atsakymas: C                                                                                      |
|           2 |      0/1 | Teisingas atsakymas: D                                                                                      |
|           3 |      0/1 | Teisingas atsakymas: B                                                                                      |
|           4 |      0/1 | Teisingas atsakymas: C                                                                                      |
|           5 |      0/1 | Teisingas atsakymas: D                                                                                      |
|           6 |      0/1 | Teisingas atsakymas: B                                                                                      |
|           7 |      2/2 | Teisingai.                                                                                                  |
|           8 |      0/2 | Apskaičiuotas ne tas fizikinis dydis.<br>Neteisingai parinkta formulė.<br>Neteisingas galutinis atsakymas.  |
|          9a |      0/2 | Nenurodyta reikalinga formulė.; Neteisingai panaudoti užduoties duomenys.; Neteisingas galutinis atsakymas. |
|          9b |      0/2 | Nenurodyta reikalinga formulė.; Neteisingai panaudoti užduoties duomenys.; Neteisingas galutinis atsakymas. |
|          9c |      0/2 | Apskaičiuotas ne tas fizikinis dydis.; Nenurodyta reikalinga formulė.; Neteisingas galutinis atsakymas.     |
| **Iš viso** | **3/16** | **Pažymys: 2**                                                                                              |$grade_md$),
  ('1G', 'Greta Lukoševičiūtė', $grade_md$### Mokinys: Greta Lukoševičiūtė

Klasė: 1G
Variantas: I
Taškai: 13/16
Pažymys: 8

| Užduotis | Taškai | Komentaras |
| --- | --- | --- |
| 1 | 1/1 | Teisingai. |
| 2 | 0/1 | Teisingas atsakymas: D |
| 3 | 0/1 | Teisingas atsakymas: B |
| 4 | 1/1 | Teisingai. |
| 5 | 1/1 | Teisingai. |
| 6 | 0/1 | Teisingas atsakymas: B |
| 7 | 2/2 | Teisingai. |
| 8 | 2/2 | Teisingai. |
| 9a | 2/2 | Teisingai. |
| 9b | 2/2 | Teisingai. |
| 9c | 2/2 | Teisingai. |
| **Iš viso** | **13/16** | **Pažymys: 8** |$grade_md$),
  ('1G', 'Jogailė Žalėnaitė', $grade_md$### Mokinys: Jogailė Žalėnaitė
Klasė: 1G  
Variantas: I  
Taškai: 15/16  
Pažymys: 10

| Užduotis | Taškai | Komentaras |
|---:|---:|---|
| 1 | 1/1 | Teisingai. |
| 2 | 0/1 | Teisingas atsakymas: D |
| 3 | 1/1 | Teisingai. |
| 4 | 1/1 | Teisingai. |
| 5 | 1/1 | Teisingai. |
| 6 | 1/1 | Teisingai. |
| 7 | 2/2 | Teisingai. |
| 8 | 2/2 | Teisingai. |
| 9a | 2/2 | Teisingai. |
| 9b | 2/2 | Teisingai. |
| 9c | 2/2 | Teisingai. |
| **Iš viso** | **15/16** | **Pažymys: 10** |$grade_md$),
  ('1G', 'Karolis Ruškys', $grade_md$### Mokinys: Karolis Ruškys

Klasė: 1G
Variantas: I
Taškai: 12/16
Pažymys: 8

| Užduotis | Taškai | Komentaras |
| --- | --- | --- |
| 1 | 1/1 | Teisingai. |
| 2 | 0/1 | Teisingas atsakymas: D |
| 3 | 1/1 | Teisingai. |
| 4 | 1/1 | Teisingai. |
| 5 | 1/1 | Teisingai. |
| 6 | 1/1 | Teisingai. |
| 7 | 2/2 | Teisingai. |
| 8 | 2/2 | Teisingai. |
| 9a | 2/2 | Teisingai. |
| 9b | 1/2 | Neteisinga sprendimo eiga. |
| 9c | 0/2 | Užduoties dalis neišspręsta. |
| **Iš viso** | **12/16** | **Pažymys: 8** |$grade_md$),
  ('1G', 'Matas Vaskela', $grade_md$### Mokinys: Matas Vaskela
Klasė: 1G  
Variantas: I  
Taškai: 14/16  
Pažymys: 9

| Užduotis | Taškai | Komentaras |
|---:|---:|---|
| 1 | 1/1 | Teisingai. |
| 2 | 0/1 | Teisingas atsakymas: D |
| 3 | 1/1 | Teisingai. |
| 4 | 1/1 | Teisingai. |
| 5 | 1/1 | Teisingai. |
| 6 | 0/1 | Teisingas atsakymas: B |
| 7 | 2/2 | Teisingai. |
| 8 | 2/2 | Teisingai. |
| 9a | 2/2 | Teisingai. |
| 9b | 2/2 | Teisingai. |
| 9c | 2/2 | Teisingai. |
| **Iš viso** | **14/16** | **Pažymys: 9** |$grade_md$),
  ('1G', 'Karolis Grigaliūnas', $grade_md$### Mokinys: Karolis Grigaliūnas

Klasė: 1G
Variantas: I
Taškai: 10/16
Pažymys: 7

| Užduotis | Taškai | Komentaras |
| --- | --- | --- |
| 1 | 1/1 | Teisingai. |
| 2 | 0/1 | Teisingas atsakymas: D |
| 3 | 1/1 | Teisingai. |
| 4 | 1/1 | Teisingai. |
| 5 | 1/1 | Teisingai. |
| 6 | 1/1 | Teisingai. |
| 7 | 2/2 | Teisingai. |
| 8 | 2/2 | Teisingai. |
| 9a | 0/2 | Neteisingai parinkta formulė. |
| 9b | 1/2 | Skaičiavimo klaida. Neteisingai įstatytos reikšmės į formulę. |
| 9c | 0/2 | Neteisingai parinkta formulė. |
| **Iš viso** | **10/16** | **Pažymys: 7** |$grade_md$),
  ('1G', 'Žygis Gailiūnas', $grade_md$### Mokinys: Žygis Gailiūnas

Klasė: 1G
Variantas: I
Taškai: 10/16
Pažymys: 7

| Užduotis | Taškai | Komentaras |
| --- | --- | --- |
| 1 | 1/1 | Teisingai. |
| 2 | 1/1 | Teisingai. |
| 3 | 1/1 | Teisingai. |
| 4 | 1/1 | Teisingai. |
| 5 | 1/1 | Teisingai. |
| 6 | 1/1 | Teisingai. |
| 7 | 2/2 | Teisingai. |
| 8 | 2/2 | Teisingai. |
| 9a | 0/2 | Nepateiktas galutinis atsakymas. Apskaičiuotas ne tas fizikinis dydis. |
| 9b | 0/2 | Užduoties dalis neišspręsta. |
| 9c | 0/2 | Užduoties dalis neišspręsta. |
| **Iš viso** | **10/16** | **Pažymys: 7** |$grade_md$),
  ('1G', 'Rukė Elzė', $grade_md$### Mokinys: Rukė Elzė

Klasė: 1G
Variantas: I
Taškai: 12.5/16
Pažymys: 8

| Užduotis | Taškai | Komentaras |
| --- | --- | --- |
| 1 | 1/1 | Teisingai. |
| 2 | 0/1 | Teisingas atsakymas: D |
| 3 | 1/1 | Teisingai. |
| 4 | 0/1 | Teisingas atsakymas: C |
| 5 | 1/1 | Teisingai. |
| 6 | 1/1 | Teisingai. |
| 7 | 2/2 | Teisingai. |
| 8 | 1/2 | Neteisingai įstatytos reikšmės į formulę. Neteisingas galutinis atsakymas. |
| 9a | 1.5/2 | Nenurodyti matavimo vienetai. |
| 9b | 2/2 | Teisingai. |
| 9c | 2/2 | Teisingai. |
| **Iš viso** | **12.5/16** | **Pažymys: 8** |$grade_md$),
  ('1G', 'Smiltė Okunevičiūtė', $grade_md$### Mokinys: Smiltė Okunevičiūtė
Klasė: 1G  
Variantas: I  
Taškai: 12/16  
Pažymys: 8

| Užduotis | Taškai | Komentaras |
|---:|---:|---|
| 1 | 1/1 | Teisingai. |
| 2 | 0/1 | Teisingas atsakymas: D |
| 3 | 1/1 | Teisingai. |
| 4 | 0/1 | Teisingas atsakymas: C |
| 5 | 1/1 | Teisingai. |
| 6 | 1/1 | Teisingai. |
| 7 | 2/2 | Teisingai. |
| 8 | 0/2 | Neteisingai parinkta formulė. |
| 9a | 2/2 | Teisingai. |
| 9b | 2/2 | Teisingai. |
| 9c | 2/2 | Teisingai. |
| **Iš viso** | **12/16** | **Pažymys: 8** |$grade_md$),
  ('1G', 'Zaranka Paulius', $grade_md$### Mokinys: Zaranka Paulius

Klasė: 1G
Variantas: I
Taškai: 6/16
Pažymys: 5

| Užduotis | Taškai | Komentaras |
| --- | --- | --- |
| 1 | 0/1 | Teisingas atsakymas: C |
| 2 | 1/1 | Teisingai. |
| 3 | 1/1 | Teisingai. |
| 4 | 1/1 | Teisingai. |
| 5 | 1/1 | Teisingai. |
| 6 | 0/1 | Teisingas atsakymas: B |
| 7 | 0/2 | Neteisingai parinkta formulė. |
| 8 | 2/2 | Teisingai. |
| 9a | 0/2 | Neteisingas galutinis atsakymas. Neteisingai panaudoti užduoties duomenys. |
| 9b | 0/2 | Užduoties dalis neišspręsta. |
| 9c | 0/2 | Užduoties dalis neišspręsta. |
| **Iš viso** | **6/16** | **Pažymys: 5** |$grade_md$),
  ('1G', 'Gintalas Matas', $grade_md$### Mokinys: Gintalas Matas

Klasė: 1G
Variantas: I
Taškai: 12/16
Pažymys: 8

| Užduotis | Taškai | Komentaras |
| --- | --- | --- |
| 1 | 0/1 | Teisingas atsakymas: C |
| 2 | 0/1 | Teisingas atsakymas: D |
| 3 | 0/1 | Teisingas atsakymas: B |
| 4 | 1/1 | Teisingai. |
| 5 | 0/1 | Teisingas atsakymas: D |
| 6 | 1/1 | Teisingai. |
| 7 | 2/2 | Teisingai. |
| 8 | 2/2 | Teisingai. |
| 9a | 2/2 | Teisingai. |
| 9b | 2/2 | Teisingai. |
| 9c | 2/2 | Teisingai. |
| **Iš viso** | **12/16** | **Pažymys: 8** |$grade_md$),
  ('1G', 'Mikutavičius Martynas', $grade_md$### Mokinys: Mikutavičius Martynas

Klasė: 1G
Variantas: I
Taškai: 7/16
Pažymys: 5

| Užduotis | Taškai | Komentaras |
| --- | --- | --- |
| 1 | 0/1 | Teisingas atsakymas: C |
| 2 | 0/1 | Teisingas atsakymas: D |
| 3 | 1/1 | Teisingai. |
| 4 | 1/1 | Teisingai. |
| 5 | 1/1 | Teisingai. |
| 6 | 0/1 | Teisingas atsakymas: B |
| 7 | 2/2 | Teisingai. |
| 8 | 2/2 | Teisingai. |
| 9a | 0/2 | Neteisingai įstatytos reikšmės į formulę. Sprendime naudotas neteisingas tūris. |
| 9b | 0/2 | Neteisingai parinkta masės reikšmė ir neteisingas tankis. |
| 9c | 0/2 | Užduoties dalis neišspręsta. |
| **Iš viso** | **7/16** | **Pažymys: 5** |$grade_md$),
  ('1G', 'Rimkutė Goda', $grade_md$### Mokinys: Rimkutė Goda
Klasė: 1G  
Variantas: I  
Taškai: 7/16  
Pažymys: 5

| Užduotis | Taškai | Komentaras |
|---:|---:|---|
| 1 | 1/1 | Teisingai. |
| 2 | 1/1 | Teisingai. |
| 3 | 1/1 | Teisingai. |
| 4 | 1/1 | Teisingai. |
| 5 | 1/1 | Teisingai. |
| 6 | 0/1 | Teisingas atsakymas: B |
| 7 | 2/2 | Teisingai. |
| 8 | 0/2 | Sprendimas nebaigtas. Neteisingai parinkta formulė. |
| 9a | 0/2 | Neteisingai panaudoti užduoties duomenys. Sprendimo eiga neteisinga. |
| 9b | 0/2 | Apskaičiuotas ne tas fizikinis dydis ir naudoti neteisingi duomenys iš ankstesnės dalies. |
| 9c | 0/2 | Užduoties dalis neišspręsta. |
| **Iš viso** | **7/16** | **Pažymys: 5** |$grade_md$),
  ('1G', 'Tilindytė Rytė', $grade_md$### Mokinys: Tilindytė Rytė

Klasė: 1G
Variantas: II
Taškai: 8/16
Pažymys: 6

| Užduotis | Taškai | Komentaras |
| --- | --- | --- |
| 1 | 1/1 | Teisingai. |
| 2 | 0/1 | Teisingas atsakymas: B |
| 3 | 0/1 | Teisingas atsakymas: B |
| 4 | 0/1 | Teisingas atsakymas: A |
| 5 | 0/1 | Teisingas atsakymas: A |
| 6 | 1/1 | Teisingai. |
| 7 | 2/2 | Teisingai. |
| 8 | 1/2 | Klaida įstatant reikšmes 5 formulę ir verčiant matavimo vienetus. |
| 9a | 1.5/2 | Nenurodyti matavimo vienetai. |
| 9b | 1.5/2 | Nenurodyti matavimo vienetai. |
| 9c | 0/2 | Nepateiktas galutinis atsakymas. Sprendimas nebaigtas. |
| **Iš viso** | **8/16** | **Pažymys: 6** |$grade_md$),
  ('1G', 'Rastenytė Goda', $grade_md$### Mokinys: Rastenytė Goda

Klasė: 1G
Variantas: II
Taškai: 5/16
Pažymys: 4

| Užduotis | Taškai | Komentaras |
| --- | --- | --- |
| 1 | 0/1 | Teisingas atsakymas: D |
| 2 | 0/1 | Teisingas atsakymas: B |
| 3 | 1/1 | Teisingai. |
| 4 | 1/1 | Teisingai. |
| 5 | 0/1 | Teisingas atsakymas: A |
| 6 | 1/1 | Teisingai. |
| 7 | 0/2 | Neteisingai parinkta formulė. Skaičiavimo klaida. |
| 8 | 0/2 | Užduotis neišspręsta. |
| 9a | 2/2 | Teisingai. |
| 9b | 0/2 | Užduoties dalis neišspręsta. |
| 9c | 0/2 | Užduoties dalis neišspręsta. |
| **Iš viso** | **5/16** | **Pažymys: 4** |$grade_md$),
  ('1G', 'Griniūtė Mėta', $grade_md$### Mokinys: Griniūtė Mėta

Klasė: 1G
Variantas: II
Taškai: 12.5/16
Pažymys: 8

| Užduotis | Taškai | Komentaras |
| --- | --- | --- |
| 1 | 1/1 | Teisingai. |
| 2 | 0/1 | Teisingas atsakymas: B |
| 3 | 1/1 | Teisingai. |
| 4 | 0/1 | Teisingas atsakymas: A |
| 5 | 1/1 | Teisingai. |
| 6 | 0/1 | Teisingas atsakymas: B |
| 7 | 2/2 | Teisingai. |
| 8 | 1.5/2 | Nepateiktas galutinis atsakymas. |
| 9a | 2/2 | Teisingai. |
| 9b | 2/2 | Teisingai. |
| 9c | 2/2 | Teisingai. |
| **Iš viso** | **12.5/16** | **Pažymys: 8** |$grade_md$),
  ('1G', 'Klybas Eimantas', $grade_md$### Mokinys: Klybas Eimantas

Klasė: 1G
Variantas: II
Taškai: 8.5/16
Pažymys: 6

| Užduotis | Taškai | Komentaras |
| --- | --- | --- |
| 1 | 1/1 | Teisingai. |
| 2 | 0/1 | Teisingas atsakymas: B |
| 3 | 1/1 | Teisingai. |
| 4 | 0/1 | Teisingas atsakymas: A |
| 5 | 0/1 | Teisingas atsakymas: A |
| 6 | 1/1 | Teisingai. |
| 7 | 2/2 | Teisingai. |
| 8 | 1.5/2 | Nurodyti netinkami matavimo vienetai. |
| 9a | 2/2 | Teisingai. |
| 9b | 0/2 | Apskaičiuota tik panirusios dalies masė, ne visa kūno masė. |
| 9c | 0/2 | Neteisingai parinkta formulė. Apskaičiuotas ne tas fizikinis dydis. |
| **Iš viso** | **8.5/16** | **Pažymys: 6** |$grade_md$),
  ('1G', 'Duršaitė Rugilė', $grade_md$### Mokinys: Duršaitė Rugilė

Klasė: 1G
Variantas: II
Taškai: 11/16
Pažymys: 7

| Užduotis | Taškai | Komentaras |
| --- | --- | --- |
| 1 | 1/1 | Teisingai. |
| 2 | 1/1 | Teisingai. |
| 3 | 0/1 | Teisingas atsakymas: B |
| 4 | 1/1 | Teisingai. |
| 5 | 0/1 | Teisingas atsakymas: A |
| 6 | 1/1 | Teisingai. |
| 7 | 2/2 | Teisingai. |
| 8 | 2/2 | Teisingai. |
| 9a | 1/2 | Neteisingai parinkta formulė (panaudotas neteisingas tankis). |
| 9b | 1/2 | Neteisingai įstatytos reikšmės (panaudotas panirusios dalies tūris). |
| 9c | 1/2 | Neteisingas galutinis atsakymas. |
| **Iš viso** | **11/16** | **Pažymys: 7** |$grade_md$),
  ('1G', 'Banys Dominykas', $grade_md$### Mokinys: Banys Dominykas

Klasė: 1G
Variantas: II
Taškai: 11/16
Pažymys: 7

| Užduotis | Taškai | Komentaras |
| --- | --- | --- |
| 1 | 1/1 | Teisingai. |
| 2 | 0/1 | Teisingas atsakymas: B |
| 3 | 1/1 | Teisingai. |
| 4 | 0/1 | Teisingas atsakymas: A |
| 5 | 0/1 | Teisingas atsakymas: A |
| 6 | 1/1 | Teisingai. |
| 7 | 2/2 | Teisingai. |
| 8 | 2/2 | Teisingai. |
| 9a | 2/2 | Teisingai. |
| 9b | 2/2 | Teisingai. |
| 9c | 0/2 | Užduoties dalis neišspręsta. |
| **Iš viso** | **11/16** | **Pažymys: 7** |$grade_md$),
  ('1G', 'Viškelis Domas', $grade_md$### Mokinys: Viškelis Domas

Klasė: 1G
Variantas: II
Taškai: 4/16
Pažymys: 3

| Užduotis | Taškai | Komentaras |
| --- | --- | --- |
| 1 | 1/1 | Teisingai. |
| 2 | 0/1 | Teisingas atsakymas: B |
| 3 | 0/1 | Teisingas atsakymas: B |
| 4 | 0/1 | Teisingas atsakymas: A |
| 5 | 1/1 | Teisingai. |
| 6 | 1/1 | Teisingai. |
| 7 | 1/2 | Skaičiavimo klaida (4500 vietoje 45000). Neteisingas galutinis atsakymas. |
| 8 | 0/2 | Sprendimas nebaigtas. Nenurodyta reikalinga formulė. |
| 9a | 0/2 | Užduoties dalis neišspręsta. |
| 9b | 0/2 | Užduoties dalis neišspręsta. |
| 9c | 0/2 | Užduoties dalis neišspręsta. |
| **Iš viso** | **4/16** | **Pažymys: 3** |$grade_md$),
  ('1G', 'Kuklieriūtė Juna', $grade_md$### Mokinys: Kuklieriūtė Juna

Klasė: 1G
Variantas: II
Taškai: 11/16
Pažymys: 7

| Užduotis | Taškai | Komentaras |
| --- | --- | --- |
| 1 | 1/1 | Teisingai. |
| 2 | 0/1 | Teisingas atsakymas: B |
| 3 | 1/1 | Teisingai. |
| 4 | 0/1 | Teisingas atsakymas: A |
| 5 | 1/1 | Teisingai. |
| 6 | 0/1 | Teisingas atsakymas: B |
| 7 | 2/2 | Teisingai. |
| 8 | 0/2 | Sprendimas nebaigtas. Neteisingai parašyta formulė. |
| 9a | 2/2 | Teisingai. |
| 9b | 2/2 | Teisingai. |
| 9c | 2/2 | Teisingai. |
| **Iš viso** | **11/16** | **Pažymys: 7** |$grade_md$),
  ('1G', 'Paliul Diana', $grade_md$### Mokinys: Paliul Diana

Klasė: 1G
Variantas: II
Taškai: 5/16
Pažymys: 4

| Užduotis | Taškai | Komentaras |
| --- | --- | --- |
| 1 | 1/1 | Teisingai. |
| 2 | 0/1 | Teisingas atsakymas: B |
| 3 | 0/1 | Teisingas atsakymas: B |
| 4 | 1/1 | Teisingai. |
| 5 | 0/1 | Teisingas atsakymas: A |
| 6 | 1/1 | Teisingai. |
| 7 | 0/2 | Neteisingai parinkta formulė. |
| 8 | 1/2 | Neteisingas galutinis atsakymas. |
| 9a | 1/2 | Sprendimas nebaigtas. Nepateiktas galutinis atsakymas. |
| 9b | 0/2 | Užduoties dalis neišspręsta. |
| 9c | 0/2 | Užduoties dalis neišspręsta. |
| **Iš viso** | **5/16** | **Pažymys: 4** |$grade_md$),
  ('1G', 'Račickytė Viltė', $grade_md$### Mokinys: Račickytė Viltė

Klasė: 1G
Variantas: II
Taškai: 11.5/16
Pažymys: 7

| Užduotis | Taškai | Komentaras |
| --- | --- | --- |
| 1 | 1/1 | Teisingai. |
| 2 | 0/1 | Teisingas atsakymas: B |
| 3 | 1/1 | Teisingai. |
| 4 | 0/1 | Teisingas atsakymas: A |
| 5 | 0/1 | Teisingas atsakymas: A |
| 6 | 0/1 | Teisingas atsakymas: B |
| 7 | 2/2 | Teisingai. |
| 8 | 1.5/2 | Klaida keičiant matavimo vienetus. |
| 9a | 2/2 | Teisingai. |
| 9b | 2/2 | Teisingai. |
| 9c | 2/2 | Teisingai. |
| **Iš viso** | **11.5/16** | **Pažymys: 7** |$grade_md$),
  ('1G', 'Kozlovskis Ruslanas', $grade_md$### Mokinys: Kozlovskis Ruslanas

Klasė: 1G
Variantas: II
Taškai: 13/16
Pažymys: 8

| Užduotis | Taškai | Komentaras |
| --- | --- | --- |
| 1 | 1/1 | Teisingai. |
| 2 | 0/1 | Teisingas atsakymas: B |
| 3 | 0/1 | Teisingas atsakymas: B |
| 4 | 0/1 | Teisingas atsakymas: A |
| 5 | 1/1 | Teisingai. |
| 6 | 1/1 | Teisingai. |
| 7 | 2/2 | Teisingai. |
| 8 | 2/2 | Teisingai. |
| 9a | 2/2 | Teisingai. |
| 9b | 2/2 | Teisingai. |
| 9c | 2/2 | Teisingai. |
| **Iš viso** | **13/16** | **Pažymys: 8** |$grade_md$),
  ('1G', 'Grigorovič Adam', $grade_md$### Mokinys: Grigorovič Adam

Klasė: 1G
Variantas: II
Taškai: 9/16
Pažymys: 6

| Užduotis | Taškai | Komentaras |
| --- | --- | --- |
| 1 | 1/1 | Teisingai. |
| 2 | 0/1 | Teisingas atsakymas: B |
| 3 | 1/1 | Teisingai. |
| 4 | 1/1 | Teisingai. |
| 5 | 1/1 | Teisingai. |
| 6 | 1/1 | Teisingai. |
| 7 | 2/2 | Teisingai. |
| 8 | 2/2 | Teisingai. |
| 9a | 0/2 | Sprendimas nebaigtas. Nepateiktas galutinis atsakymas. |
| 9b | 0/2 | Užduoties dalis neišspręsta. |
| 9c | 0/2 | Užduoties dalis neišspręsta. |
| **Iš viso** | **9/16** | **Pažymys: 6** |$grade_md$),
  ('1G', 'Staponkus Simas', $grade_md$### Mokinys: Staponkus Simas

Klasė: 1G
Variantas: II
Taškai: 11/16
Pažymys: 7

| Užduotis | Taškai | Komentaras |
| --- | --- | --- |
| 1 | 1/1 | Teisingai. |
| 2 | 0/1 | Teisingas atsakymas: B |
| 3 | 0/1 | Teisingas atsakymas: B |
| 4 | 0/1 | Teisingas atsakymas: A |
| 5 | 1/1 | Teisingai. |
| 6 | 0/1 | Teisingas atsakymas: B |
| 7 | 2/2 | Teisingai. |
| 8 | 1/2 | Formulė neišreikšta iki ieškomo dydžio. Skaičiavimo klaida. |
| 9a | 2/2 | Teisingai. |
| 9b | 2/2 | Teisingai. |
| 9c | 2/2 | Teisingai. |
| **Iš viso** | **11/16** | **Pažymys: 7** |$grade_md$),
  ('1I', 'Babkinas Modestas', $grade_md$### Mokinys: Babkinas Modestas

Klasė: 1I
Variantas: II
Taškai: 4/16
Pažymys: 3

|    Užduotis |   Taškai | Komentaras                                                                                                 |
| -----------: | --------: | ---------------------------------------------------------------------------------------------------------- |
|           1 |      0/1 | Teisingas atsakymas: D                                                                                     |
|           2 |      1/1 | Teisingas atsakymas: B                                                                                     |
|           3 |      0/1 | Teisingas atsakymas: B                                                                                     |
|           4 |      0/1 | Teisingas atsakymas: A                                                                                     |
|           5 |      1/1 | Teisingas atsakymas: A                                                                                     |
|           6 |      0/1 | Teisingas atsakymas: B                                                                                     |
|           7 |      0/2 | Neteisingai parinkta formulė.<br>Neteisingas galutinis atsakymas.                                          |
|           8 |      2/2 | Teisingai.                                                                                                 |
|          9a |      0/2 | Neteisingai parinkta formulė.; Neteisingai panaudoti užduoties duomenys.; Neteisingas galutinis atsakymas. |
|          9b |      0/2 | Neteisingai parinkta formulė.; Neteisingas galutinis atsakymas.                                            |
|          9c |      0/2 | Neteisingai parinkta formulė.; Neteisingas galutinis atsakymas.                                            |
| **Iš viso** | **4/16** | **Pažymys: 3**                                                                                             |$grade_md$),
  ('1I', 'Stankevič Ernest', $grade_md$### Mokinys: Stankevič Ernest

Klasė: 1I
Variantas: II
Taškai: 5/16
Pažymys: 4

|    Užduotis |   Taškai | Komentaras                       |
| -----------: | --------: | -------------------------------- |
|           1 |      1/1 | Teisingas atsakymas: D           |
|           2 |      0/1 | Teisingas atsakymas: B           |
|           3 |      0/1 | Teisingas atsakymas: B           |
|           4 |      0/1 | Teisingas atsakymas: A           |
|           5 |      1/1 | Teisingas atsakymas: A           |
|           6 |      1/1 | Teisingas atsakymas: B           |
|           7 |      2/2 | Teisingai.                       |
|           8 |      0/2 | Nepateiktas galutinis atsakymas. |
|          9a |      0/2 | Užduoties dalis neišspręsta.     |
|          9b |      0/2 | Užduoties dalis neišspręsta.     |
|          9c |      0/2 | Užduoties dalis neišspręsta.     |
| **Iš viso** | **5/16** | **Pažymys: 4**                   |$grade_md$),
  ('1I', 'Jusys Arminas', $grade_md$### Mokinys: Jusys Arminas

Klasė: 1I
Variantas: II
Taškai: 4/16
Pažymys: 3

|    Užduotis |   Taškai | Komentaras                                                        |
| -----------: | --------: | ----------------------------------------------------------------- |
|           1 |      1/1 | Teisingas atsakymas: D                                            |
|           2 |      1/1 | Teisingas atsakymas: B                                            |
|           3 |      0/1 | Teisingas atsakymas: B                                            |
|           4 |      1/1 | Teisingas atsakymas: A                                            |
|           5 |      0/1 | Teisingas atsakymas: A                                            |
|           6 |      1/1 | Teisingas atsakymas: B                                            |
|           7 |      0/2 | Neteisingai parinkta formulė.<br>Neteisingas galutinis atsakymas. |
|           8 |      0/2 | Neteisingai parinkta formulė.<br>Neteisingas galutinis atsakymas. |
|          9a |      0/2 | Užduoties dalis neišspręsta.                                      |
|          9b |      0/2 | Užduoties dalis neišspręsta.                                      |
|          9c |      0/2 | Užduoties dalis neišspręsta.                                      |
| **Iš viso** | **4/16** | **Pažymys: 3**                                                    |$grade_md$),
  ('1I', 'Dubov Aleksej', $grade_md$### Mokinys: Dubov Aleksej

Klasė: 1I
Variantas: II
Taškai: 5/16
Pažymys: 4

|    Užduotis |   Taškai | Komentaras                                                        |
| -----------: | --------: | ----------------------------------------------------------------- |
|           1 |      1/1 | Teisingas atsakymas: D                                            |
|           2 |      0/1 | Teisingas atsakymas: B                                            |
|           3 |      1/1 | Teisingas atsakymas: B                                            |
|           4 |      0/1 | Teisingas atsakymas: A                                            |
|           5 |      1/1 | Teisingas atsakymas: A                                            |
|           6 |      0/1 | Teisingas atsakymas: B                                            |
|           7 |      2/2 | Teisingai.                                                        |
|           8 |      0/2 | Neteisingai parinkta formulė.<br>Neteisingas galutinis atsakymas. |
|          9a |      0/2 | Užduoties dalis neišspręsta.                                      |
|          9b |      0/2 | Užduoties dalis neišspręsta.                                      |
|          9c |      0/2 | Užduoties dalis neišspręsta.                                      |
| **Iš viso** | **5/16** | **Pažymys: 4**                                                    |$grade_md$),
  ('1I', 'Markelionis Titas', $grade_md$### Mokinys: Markelionis Titas

Klasė: 1I
Variantas: II
Taškai: 6/16
Pažymys: 5

|    Užduotis |   Taškai | Komentaras                                                                  |
| -----------: | --------: | --------------------------------------------------------------------------- |
|           1 |      1/1 | Teisingas atsakymas: D                                                      |
|           2 |      1/1 | Teisingas atsakymas: B                                                      |
|           3 |      1/1 | Teisingas atsakymas: B                                                      |
|           4 |      1/1 | Teisingas atsakymas: A                                                      |
|           5 |      1/1 | Teisingas atsakymas: A                                                      |
|           6 |      0/1 | Teisingas atsakymas: B                                                      |
|           7 |      0/2 | Neteisingai parinkta formulė.<br>Neteisingas galutinis atsakymas.           |
|           8 |      0/2 | Nepateiktas galutinis atsakymas.                                            |
|          9a |      1/2 | Neteisingai panaudoti užduoties duomenys.; Neteisingas galutinis atsakymas. |
|          9b |      0/2 | Užduoties dalis neišspręsta.                                                |
|          9c |      0/2 | Užduoties dalis neišspręsta.                                                |
| **Iš viso** | **6/16** | **Pažymys: 5**                                                              |$grade_md$),
  ('1I', 'Jadeškaitė Skaistė', $grade_md$### Mokinys: Jadeškaitė Skaistė

Klasė: 1I
Variantas: II
Taškai: 2/16
Pažymys: 2

|    Užduotis |   Taškai | Komentaras                                                        |
| -----------: | --------: | ----------------------------------------------------------------- |
|           1 |      1/1 | Teisingas atsakymas: D                                            |
|           2 |      0/1 | Teisingas atsakymas: B                                            |
|           3 |      1/1 | Teisingas atsakymas: B                                            |
|           4 |      0/1 | Teisingas atsakymas: A                                            |
|           5 |      0/1 | Teisingas atsakymas: A                                            |
|           6 |      0/1 | Teisingas atsakymas: B                                            |
|           7 |      0/2 | Neteisingai parinkta formulė.<br>Neteisingas galutinis atsakymas. |
|           8 |      0/2 | Neteisingai parinkta formulė.<br>Neteisingas galutinis atsakymas. |
|          9a |      0/2 | Užduoties dalis neišspręsta.                                      |
|          9b |      0/2 | Užduoties dalis neišspręsta.                                      |
|          9c |      0/2 | Užduoties dalis neišspręsta.                                      |
| **Iš viso** | **2/16** | **Pažymys: 2**                                                    |$grade_md$),
  ('1I', 'Valentukevičius Jokūbas', $grade_md$### Mokinys: Valentukevičius Jokūbas

Klasė: 1I
Variantas: II
Taškai: 6/16
Pažymys: 5

|    Užduotis |   Taškai | Komentaras                                                      |
| -----------: | --------: | --------------------------------------------------------------- |
|           1 |      1/1 | Teisingas atsakymas: D                                          |
|           2 |      0/1 | Teisingas atsakymas: B                                          |
|           3 |      0/1 | Teisingas atsakymas: B                                          |
|           4 |      0/1 | Teisingas atsakymas: A                                          |
|           5 |      1/1 | Teisingas atsakymas: A                                          |
|           6 |      0/1 | Teisingas atsakymas: B                                          |
|           7 |      1/2 | Neteisingai parinkta formulė.                                   |
|           8 |      2/2 | Teisingai.                                                      |
|          9a |      1/2 | Neteisingas galutinis atsakymas.                                |
|          9b |      0/2 | Neteisingai parinkta formulė.; Neteisingas galutinis atsakymas. |
|          9c |      0/2 | Neteisingai parinkta formulė.; Neteisingas galutinis atsakymas. |
| **Iš viso** | **6/16** | **Pažymys: 5**                                                  |$grade_md$),
  ('1I', 'Jonaitis Kristupas', $grade_md$### Mokinys: Jonaitis Kristupas

Klasė: 1I
Variantas: II
Taškai: 4/16
Pažymys: 3

|    Užduotis |   Taškai | Komentaras                                                         |
| -----------: | --------: | ------------------------------------------------------------------ |
|           1 |      1/1 | Teisingas atsakymas: D                                             |
|           2 |      1/1 | Teisingas atsakymas: B                                             |
|           3 |      1/1 | Teisingas atsakymas: B                                             |
|           4 |      0/1 | Teisingas atsakymas: A                                             |
|           5 |      0/1 | Teisingas atsakymas: A                                             |
|           6 |      1/1 | Teisingas atsakymas: B                                             |
|           7 |      0/2 | Neteisingai parinkta formulė.<br>Neteisingas galutinis atsakymas.  |
|           8 |      0/2 | Nenurodyta reikalinga formulė.<br>Neteisingas galutinis atsakymas. |
|          9a |      0/2 | Neteisingai parinkta formulė.; Neteisingas galutinis atsakymas.    |
|          9b |      0/2 | Neteisingai parinkta formulė.; Neteisingas galutinis atsakymas.    |
|          9c |      0/2 | Neteisingai parinkta formulė.; Neteisingas galutinis atsakymas.    |
| **Iš viso** | **4/16** | **Pažymys: 3**                                                     |$grade_md$),
  ('1I', 'Valiūnas Ainis', $grade_md$### Mokinys: Valiūnas Ainis

Klasė: 1I
Variantas: II
Taškai: 0/16
Pažymys: 1

|    Užduotis |   Taškai | Komentaras                       |
| -----------: | --------: | -------------------------------- |
|           1 |      0/1 | Teisingas atsakymas: D           |
|           2 |      0/1 | Teisingas atsakymas: B           |
|           3 |      0/1 | Teisingas atsakymas: B           |
|           4 |      0/1 | Teisingas atsakymas: A           |
|           5 |      0/1 | Teisingas atsakymas: A           |
|           6 |      0/1 | Teisingas atsakymas: B           |
|           7 |      0/2 | Nepateiktas galutinis atsakymas. |
|           8 |      0/2 | Nepateiktas galutinis atsakymas. |
|          9a |      0/2 | Užduoties dalis neišspręsta.     |
|          9b |      0/2 | Užduoties dalis neišspręsta.     |
|          9c |      0/2 | Užduoties dalis neišspręsta.     |
| **Iš viso** | **0/16** | **Pažymys: 1**                   |$grade_md$),
  ('1I', 'Misiūnas Martas', $grade_md$### Mokinys: Misiūnas Martas

Klasė: 1I
Variantas: I
Taškai: 15/16
Pažymys: 10

|    Užduotis |    Taškai | Komentaras                    |
| -----------: | ---------: | ----------------------------- |
|           1 |       1/1 | Teisingas atsakymas: C        |
|           2 |       1/1 | Teisingas atsakymas: D        |
|           3 |       1/1 | Teisingas atsakymas: B        |
|           4 |       1/1 | Teisingas atsakymas: C        |
|           5 |       1/1 | Teisingas atsakymas: D        |
|           6 |       1/1 | Teisingas atsakymas: B        |
|           7 |       2/2 | Teisingai.                    |
|           8 |       1/2 | Neteisingai parinkta formulė. |
|          9a |       2/2 | Teisingai.                    |
|          9b |       2/2 | Teisingai.                    |
|          9c |       2/2 | Teisingai.                    |
| **Iš viso** | **15/16** | **Pažymys: 10**               |$grade_md$),
  ('1I', 'Dambrauskas Jonas', $grade_md$### Mokinys: Dambrauskas Jonas

Klasė: 1I
Variantas: I
Taškai: 5/16
Pažymys: 4

|    Užduotis |   Taškai | Komentaras                                                                                                 |
| -----------: | --------: | ---------------------------------------------------------------------------------------------------------- |
|           1 |      1/1 | Teisingas atsakymas: C                                                                                     |
|           2 |      1/1 | Teisingas atsakymas: D                                                                                     |
|           3 |      1/1 | Teisingas atsakymas: B                                                                                     |
|           4 |      1/1 | Teisingas atsakymas: C                                                                                     |
|           5 |      1/1 | Teisingas atsakymas: D                                                                                     |
|           6 |      0/1 | Teisingas atsakymas: B                                                                                     |
|           7 |      0/2 | Neteisingai parinkta formulė.<br>Neteisingas galutinis atsakymas.                                          |
|           8 |      0/2 | Neteisingai parinkta formulė.<br>Neteisingas galutinis atsakymas.                                          |
|          9a |      0/2 | Neteisingai parinkta formulė.; Neteisingas galutinis atsakymas.                                            |
|          9b |      0/2 | Išbrauktas teisingas atsakymas.; Neteisingai nurodyti matavimo vienetai.; Neteisingas galutinis atsakymas. |
|          9c |      0/2 | Užduoties dalis neišspręsta.                                                                               |
| **Iš viso** | **5/16** | **Pažymys: 4**                                                                                             |$grade_md$),
  ('1I', 'Gujis Evaldas', $grade_md$### Mokinys: Gujis Evaldas

Klasė: 1I
Variantas: I
Taškai: 11.5/16
Pažymys: 7

|    Užduotis |      Taškai | Komentaras                    |
| -----------: | -----------: | ----------------------------- |
|           1 |         1/1 | Teisingas atsakymas: C        |
|           2 |         1/1 | Teisingas atsakymas: D        |
|           3 |         1/1 | Teisingas atsakymas: B        |
|           4 |         0/1 | Teisingas atsakymas: C        |
|           5 |         1/1 | Teisingas atsakymas: D        |
|           6 |         0/1 | Teisingas atsakymas: B        |
|           7 |         2/2 | Teisingai.                    |
|           8 |         2/2 | Teisingai.                    |
|          9a |         0/2 | Užduoties dalis neišspręsta.  |
|          9b |         2/2 | Teisingai.                    |
|          9c |       1.5/2 | Nenurodyti matavimo vienetai. |
| **Iš viso** | **11.5/16** | **Pažymys: 7**                |$grade_md$),
  ('1I', 'Metlovaitė Sofija', $grade_md$### Mokinys: Metlovaitė Sofija

Klasė: 1I
Variantas: I
Taškai: 6.5/16
Pažymys: 5

|    Užduotis |     Taškai | Komentaras                                                        |
| -----------: | ----------: | ----------------------------------------------------------------- |
|           1 |        0/1 | Teisingas atsakymas: C                                            |
|           2 |        1/1 | Teisingas atsakymas: D                                            |
|           3 |        1/1 | Teisingas atsakymas: B                                            |
|           4 |        1/1 | Teisingas atsakymas: C                                            |
|           5 |        1/1 | Teisingas atsakymas: D                                            |
|           6 |        1/1 | Teisingas atsakymas: B                                            |
|           7 |      1.5/2 | Neteisingai nurodyti matavimo vienetai.                           |
|           8 |        0/2 | Neteisingai parinkta formulė.<br>Neteisingas galutinis atsakymas. |
|          9a |        0/2 | Neteisingai parinkta formulė.; Neteisingas galutinis atsakymas.   |
|          9b |        0/2 | Neteisingai parinkta formulė.; Neteisingas galutinis atsakymas.   |
|          9c |        0/2 | Neteisingai parinkta formulė.; Neteisingas galutinis atsakymas.   |
| **Iš viso** | **6.5/16** | **Pažymys: 5**                                                    |$grade_md$),
  ('1I', 'Jasiūnas Rokas', $grade_md$### Mokinys: Jasiūnas Rokas

Klasė: 1I
Variantas: I
Taškai: 4/16
Pažymys: 3

|    Užduotis |   Taškai | Komentaras                                                                  |
| -----------: | --------: | --------------------------------------------------------------------------- |
|           1 |      1/1 | Teisingas atsakymas: C                                                      |
|           2 |      0/1 | Teisingas atsakymas: D                                                      |
|           3 |      0/1 | Teisingas atsakymas: B                                                      |
|           4 |      0/1 | Teisingas atsakymas: C                                                      |
|           5 |      0/1 | Teisingas atsakymas: D                                                      |
|           6 |      1/1 | Teisingas atsakymas: B                                                      |
|           7 |      2/2 | Teisingai.                                                                  |
|           8 |      0/2 | Formulė neišreikšta iki ieškomo dydžio.<br>Neteisingas galutinis atsakymas. |
|          9a |      0/2 | Užduoties dalis neišspręsta.                                                |
|          9b |      0/2 | Užduoties dalis neišspręsta.                                                |
|          9c |      0/2 | Užduoties dalis neišspręsta.                                                |
| **Iš viso** | **4/16** | **Pažymys: 3**                                                              |$grade_md$),
  ('1I', 'Paužuolis Nedas', $grade_md$### Mokinys: Paužuolis Nedas

Klasė: 1I
Variantas: I
Taškai: 3/16
Pažymys: 2

|    Užduotis |   Taškai | Komentaras                                                        |
| -----------: | --------: | ----------------------------------------------------------------- |
|           1 |      1/1 | Teisingas atsakymas: C                                            |
|           2 |      0/1 | Teisingas atsakymas: D                                            |
|           3 |      1/1 | Teisingas atsakymas: B                                            |
|           4 |      1/1 | Teisingas atsakymas: C                                            |
|           5 |      0/1 | Teisingas atsakymas: D                                            |
|           6 |      0/1 | Teisingas atsakymas: B                                            |
|           7 |      0/2 | Neteisingai parinkta formulė.<br>Neteisingas galutinis atsakymas. |
|           8 |      0/2 | Nepateiktas galutinis atsakymas.                                  |
|          9a |      0/2 | Užduoties dalis neišspręsta.                                      |
|          9b |      0/2 | Užduoties dalis neišspręsta.                                      |
|          9c |      0/2 | Užduoties dalis neišspręsta.                                      |
| **Iš viso** | **3/16** | **Pažymys: 2**                                                    |$grade_md$),
  ('1I', 'Tomaševskij Karolis', $grade_md$### Mokinys: Tomaševskij Karolis

Klasė: 1I
Variantas: I
Taškai: 5/16
Pažymys: 4

|    Užduotis |   Taškai | Komentaras                                                                  |
| -----------: | --------: | --------------------------------------------------------------------------- |
|           1 |      1/1 | Teisingas atsakymas: C                                                      |
|           2 |      1/1 | Teisingas atsakymas: D                                                      |
|           3 |      1/1 | Teisingas atsakymas: B                                                      |
|           4 |      1/1 | Teisingas atsakymas: C                                                      |
|           5 |      0/1 | Teisingas atsakymas: D                                                      |
|           6 |      0/1 | Teisingas atsakymas: B                                                      |
|           7 |      0/2 | Neteisingai parinkta formulė.<br>Neteisingas galutinis atsakymas.           |
|           8 |      1/2 | Formulė neišreikšta iki ieškomo dydžio.<br>Neteisingas galutinis atsakymas. |
|          9a |      0/2 | Užduoties dalis neišspręsta.                                                |
|          9b |      0/2 | Užduoties dalis neišspręsta.                                                |
|          9c |      0/2 | Užduoties dalis neišspręsta.                                                |
| **Iš viso** | **5/16** | **Pažymys: 4**                                                              |$grade_md$),
  ('1I', 'Bžozovski Augustas', $grade_md$### Mokinys: Bžozovski Augustas

Klasė: 1I
Variantas: I
Taškai: 12.5/16
Pažymys: 8

|    Užduotis |      Taškai | Komentaras                    |
| -----------: | -----------: | ----------------------------- |
|           1 |         1/1 | Teisingas atsakymas: C        |
|           2 |         0/1 | Teisingas atsakymas: D        |
|           3 |         1/1 | Teisingas atsakymas: B        |
|           4 |         1/1 | Teisingas atsakymas: C        |
|           5 |         1/1 | Teisingas atsakymas: D        |
|           6 |         1/1 | Teisingas atsakymas: B        |
|           7 |       1.5/2 | Nenurodyti matavimo vienetai. |
|           8 |         2/2 | Teisingai.                    |
|          9a |         2/2 | Teisingai.                    |
|          9b |         2/2 | Teisingai.                    |
|          9c |         0/2 | Užduoties dalis neišspręsta.  |
| **Iš viso** | **12.5/16** | **Pažymys: 8**                |$grade_md$),
  ('1I', 'Stefanovič Greta', $grade_md$### Mokinys: Stefanovič Greta

Klasė: 1I
Variantas: I
Taškai: 6/16
Pažymys: 5

|    Užduotis |   Taškai | Komentaras                                                         |
| -----------: | --------: | ------------------------------------------------------------------ |
|           1 |      1/1 | Teisingas atsakymas: C                                             |
|           2 |      0/1 | Teisingas atsakymas: D                                             |
|           3 |      1/1 | Teisingas atsakymas: B                                             |
|           4 |      1/1 | Teisingas atsakymas: C                                             |
|           5 |      1/1 | Teisingas atsakymas: D                                             |
|           6 |      0/1 | Teisingas atsakymas: B                                             |
|           7 |      2/2 | Teisingai.                                                         |
|           8 |      0/2 | Nenurodyta reikalinga formulė.<br>Neteisingas galutinis atsakymas. |
|          9a |      0/2 | Sprendimas nebaigtas.; Neteisingas galutinis atsakymas.            |
|          9b |      0/2 | Užduoties dalis neišspręsta.                                       |
|          9c |      0/2 | Užduoties dalis neišspręsta.                                       |
| **Iš viso** | **6/16** | **Pažymys: 5**                                                     |$grade_md$),
  ('1I', 'Barkovskis Mantas', $grade_md$### Mokinys: Barkovskis Mantas

Klasė: 1I
Variantas: I
Taškai: 4/16
Pažymys: 3

|    Užduotis |   Taškai | Komentaras                       |
| -----------: | --------: | -------------------------------- |
|           1 |      1/1 | Teisingas atsakymas: C           |
|           2 |      0/1 | Teisingas atsakymas: D           |
|           3 |      1/1 | Teisingas atsakymas: B           |
|           4 |      0/1 | Teisingas atsakymas: C           |
|           5 |      1/1 | Teisingas atsakymas: D           |
|           6 |      1/1 | Teisingas atsakymas: B           |
|           7 |      0/2 | Nepateiktas galutinis atsakymas. |
|           8 |      0/2 | Nepateiktas galutinis atsakymas. |
|          9a |      0/2 | Užduoties dalis neišspręsta.     |
|          9b |      0/2 | Užduoties dalis neišspręsta.     |
|          9c |      0/2 | Užduoties dalis neišspręsta.     |
| **Iš viso** | **4/16** | **Pažymys: 3**                   |$grade_md$);

CREATE TEMP TABLE _grade_name_aliases (
  class_name text NOT NULL,
  grade_student_name text NOT NULL,
  profile_student_name text NOT NULL
) ON COMMIT PRESERVE ROWS;

INSERT INTO _grade_name_aliases (class_name, grade_student_name, profile_student_name)
VALUES ('1F', 'Didžiokas Norbertas', 'Norbertas Did');

CREATE TEMP TABLE _grade_sender ON COMMIT PRESERVE ROWS AS
SELECT id AS sender_id
FROM public.profiles
WHERE is_admin = true
ORDER BY created_at ASC, id ASC
LIMIT 1;

CREATE TEMP TABLE _grade_classrooms ON COMMIT PRESERVE ROWS AS
WITH wanted AS (
  SELECT DISTINCT class_name
  FROM _grade_messages
),
candidates AS (
  SELECT
    wanted.class_name,
    classrooms.id,
    classrooms.name
  FROM wanted
  LEFT JOIN public.classrooms classrooms
    ON pg_temp.norm_grade_name(classrooms.name) LIKE '%slegis%'
   AND (
      upper(regexp_replace(trim(classrooms.name), '\s+', ' ', 'g')) = upper(wanted.class_name)
      OR upper(regexp_replace(trim(classrooms.name), '\s+', ' ', 'g')) ~ ('(^|[^[:alnum:]])' || upper(wanted.class_name) || '([^[:alnum:]]|$)')
    )
)
SELECT
  class_name,
  count(id)::integer AS classroom_count,
  array_agg(id ORDER BY name) FILTER (WHERE id IS NOT NULL) AS classroom_ids,
  array_agg(name ORDER BY name) FILTER (WHERE id IS NOT NULL) AS classroom_names
FROM candidates
GROUP BY class_name;

CREATE TEMP TABLE _grade_message_matches ON COMMIT PRESERVE ROWS AS
WITH candidate_scores AS (
  SELECT
    gm.class_name,
    gm.student_name,
    gm.content,
    p.id AS student_id,
    concat_ws(' ', p.first_name, p.last_name) AS matched_name,
    score.match_score,
    score.match_reason
  FROM _grade_messages gm
  LEFT JOIN _grade_name_aliases aliases
    ON aliases.class_name = gm.class_name
   AND aliases.grade_student_name = gm.student_name
  JOIN _grade_classrooms gc
    ON gc.class_name = gm.class_name
   AND gc.classroom_count = 1
  JOIN public.enrollments e
    ON e.classroom_id = gc.classroom_ids[1]
  JOIN public.profiles p
    ON p.id = e.student_id
   AND p.role = 'student'
  CROSS JOIN LATERAL (
    SELECT
      pg_temp.norm_grade_name(coalesce(aliases.profile_student_name, gm.student_name)) AS grade_norm,
      pg_temp.norm_grade_name(concat_ws(' ', p.first_name, p.last_name)) AS first_last_norm,
      pg_temp.norm_grade_name(concat_ws(' ', p.last_name, p.first_name)) AS last_first_norm,
      pg_temp.grade_name_tokens(coalesce(aliases.profile_student_name, gm.student_name)) AS grade_tokens,
      pg_temp.grade_name_tokens(concat_ws(' ', p.first_name, p.last_name)) AS profile_tokens
  ) normalized
  CROSS JOIN LATERAL (
    SELECT greatest(
      pg_temp.grade_name_similarity(normalized.grade_norm, normalized.first_last_norm),
      pg_temp.grade_name_similarity(normalized.grade_norm, normalized.last_first_norm)
    ) AS similarity
  ) fuzzy
  CROSS JOIN LATERAL (
    SELECT
      CASE
        WHEN normalized.grade_norm IN (normalized.first_last_norm, normalized.last_first_norm) THEN 100::numeric
        WHEN normalized.grade_tokens @> normalized.profile_tokens
         AND normalized.profile_tokens @> normalized.grade_tokens THEN 98::numeric
        WHEN cardinality(normalized.grade_tokens) >= 2
         AND cardinality(normalized.profile_tokens) >= 2
         AND (
           normalized.grade_tokens @> normalized.profile_tokens
           OR normalized.profile_tokens @> normalized.grade_tokens
         ) THEN 94::numeric
        WHEN fuzzy.similarity >= 0.88 THEN round(fuzzy.similarity * 100, 2)
        ELSE 0::numeric
      END AS match_score,
      CASE
        WHEN normalized.grade_norm IN (normalized.first_last_norm, normalized.last_first_norm) THEN 'exact-normalized'
        WHEN normalized.grade_tokens @> normalized.profile_tokens
         AND normalized.profile_tokens @> normalized.grade_tokens THEN 'same-name-tokens'
        WHEN cardinality(normalized.grade_tokens) >= 2
         AND cardinality(normalized.profile_tokens) >= 2
         AND (
           normalized.grade_tokens @> normalized.profile_tokens
           OR normalized.profile_tokens @> normalized.grade_tokens
         ) THEN 'extra-or-missing-name-token'
        WHEN fuzzy.similarity >= 0.88 THEN 'small-spelling-difference'
        ELSE 'no-match'
      END AS match_reason
  ) score
  WHERE score.match_score >= 88
),
ranked_candidates AS (
  SELECT
    candidate_scores.*,
    row_number() OVER (
      PARTITION BY class_name, student_name, content
      ORDER BY match_score DESC, matched_name, student_id
    ) AS candidate_position,
    max(match_score) OVER (
      PARTITION BY class_name, student_name, content
    ) AS top_score,
    nth_value(match_score, 2) OVER (
      PARTITION BY class_name, student_name, content
      ORDER BY match_score DESC, matched_name, student_id
      ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS second_score
  FROM candidate_scores
),
best_candidates AS (
  SELECT
    *,
    second_score IS NULL OR top_score - second_score >= 5 AS is_safe_match
  FROM ranked_candidates
  WHERE candidate_position = 1
)
SELECT
  gm.class_name,
  gm.student_name,
  gm.content,
  CASE
    WHEN best.student_id IS NULL THEN 0
    WHEN best.is_safe_match THEN 1
    ELSE 2
  END::integer AS match_count,
  CASE
    WHEN best.student_id IS NULL THEN NULL::uuid[]
    WHEN best.is_safe_match THEN ARRAY[best.student_id]::uuid[]
    ELSE array_agg(ranked.student_id ORDER BY ranked.candidate_position) FILTER (WHERE ranked.candidate_position <= 3)
  END AS matched_student_ids,
  CASE
    WHEN best.student_id IS NULL THEN NULL::text[]
    WHEN best.is_safe_match THEN ARRAY[
      format('%s [%s score=%s]', best.matched_name, best.match_reason, round(best.match_score, 2)::text)
    ]::text[]
    ELSE array_agg(
      format('%s [%s score=%s]', ranked.matched_name, ranked.match_reason, round(ranked.match_score, 2)::text)
      ORDER BY ranked.candidate_position
    ) FILTER (WHERE ranked.candidate_position <= 3)
  END AS matched_names
FROM _grade_messages gm
LEFT JOIN best_candidates best
  ON best.class_name = gm.class_name
 AND best.student_name = gm.student_name
 AND best.content = gm.content
LEFT JOIN ranked_candidates ranked
  ON ranked.class_name = gm.class_name
 AND ranked.student_name = gm.student_name
 AND ranked.content = gm.content
GROUP BY
  gm.class_name,
  gm.student_name,
  gm.content,
  best.student_id,
  best.matched_name,
  best.match_score,
  best.match_reason,
  best.is_safe_match;

DO $validate$
DECLARE
  sender_count integer;
  bad_class_counts text;
  bad_classroom_details text;
  bad_match_count integer;
  bad_match_details text;
BEGIN
  SELECT count(*)::integer
    INTO sender_count
  FROM _grade_sender;

  IF sender_count <> 1 THEN
    RAISE EXCEPTION 'Sender validation failed: expected at least one admin profile to use as sender_id, found %.', sender_count;
  END IF;

  SELECT string_agg(
           format('%s expected %s sections, got %s', expected.class_name, expected.expected_count, coalesce(actual.actual_count, 0)),
           E'\n'
         )
    INTO bad_class_counts
  FROM (
    VALUES
    ('1D', 29),
    ('1E', 27),
    ('1F', 29),
    ('1G', 25),
    ('1I', 19)
  ) AS expected(class_name, expected_count)
  LEFT JOIN (
    SELECT class_name, count(*)::integer AS actual_count
    FROM _grade_messages
    GROUP BY class_name
  ) AS actual USING (class_name)
  WHERE coalesce(actual.actual_count, 0) <> expected.expected_count;

  IF bad_class_counts IS NOT NULL THEN
    RAISE EXCEPTION 'Grade message count validation failed:%', E'\n' || bad_class_counts;
  END IF;

  IF EXISTS (SELECT 1 FROM _grade_messages WHERE student_name = '41-42 lapas') THEN
    RAISE EXCEPTION 'Excluded non-student heading 41-42 lapas is still present in _grade_messages.';
  END IF;

  SELECT string_agg(
           format(
             '%s matched %s classrooms%s',
             class_name,
             classroom_count,
             CASE
               WHEN classroom_names IS NULL THEN ''
               ELSE ' (' || array_to_string(classroom_names, ', ') || ')'
             END
           ),
           E'\n'
         )
    INTO bad_classroom_details
  FROM _grade_classrooms
  WHERE classroom_count <> 1;

  IF bad_classroom_details IS NOT NULL THEN
    RAISE EXCEPTION 'Classroom validation failed: each grade class must match exactly one classroom. Problems:%',
      E'\n' || bad_classroom_details;
  END IF;

  SELECT count(*)::integer
    INTO bad_match_count
  FROM _grade_message_matches
  WHERE match_count <> 1;

  IF bad_match_count > 0 THEN
    SELECT string_agg(
             format(
               '%s / %s: %s matches%s',
               class_name,
               student_name,
               match_count,
               CASE
                 WHEN matched_names IS NULL THEN ''
                 ELSE ' (' || array_to_string(matched_names, ', ') || ')'
               END
             ),
             E'\n'
           )
      INTO bad_match_details
    FROM (
      SELECT *
      FROM _grade_message_matches
      WHERE match_count <> 1
      ORDER BY class_name, student_name
      LIMIT 20
    ) AS problems;

    RAISE EXCEPTION 'Grade message validation failed: % section(s) do not match exactly one enrolled student. First problems:%',
      bad_match_count,
      E'\n' || coalesce(bad_match_details, '');
  END IF;
END
$validate$;

CREATE TEMP TABLE _grade_message_targets ON COMMIT PRESERVE ROWS AS
SELECT
  class_name,
  student_name,
  matched_student_ids[1] AS student_id,
  content
FROM _grade_message_matches
WHERE match_count = 1;

CREATE TEMP TABLE _grade_to_insert ON COMMIT PRESERVE ROWS AS
SELECT
  target.class_name,
  target.student_name,
  target.student_id,
  'Savarankiško darbo rezultatai'::text AS title,
  target.content,
  EXISTS (
    SELECT 1
    FROM public.student_messages existing
    WHERE existing.student_id = target.student_id
      AND existing.title = 'Savarankiško darbo rezultatai'
      AND existing.content = target.content
  ) AS already_exists
FROM _grade_message_targets target;

CREATE TEMP TABLE _grade_inserted ON COMMIT PRESERVE ROWS AS
WITH inserted AS (
  INSERT INTO public.student_messages (student_id, sender_id, title, content)
  SELECT
    student_id,
    (SELECT sender_id FROM _grade_sender) AS sender_id,
    title,
    content
  FROM _grade_to_insert
  WHERE already_exists = false
  RETURNING id, student_id, title, content, created_at
)
SELECT * FROM inserted;

COMMIT;

SELECT
  CASE WHEN GROUPING(to_insert.class_name) = 1 THEN 'TOTAL' ELSE to_insert.class_name END AS class_name,
  count(*)::integer AS validated_sections,
  count(*) FILTER (WHERE to_insert.already_exists)::integer AS skipped_existing,
  count(inserted.id)::integer AS inserted
FROM _grade_to_insert to_insert
LEFT JOIN _grade_inserted inserted
  ON inserted.student_id = to_insert.student_id
 AND inserted.title = to_insert.title
 AND inserted.content = to_insert.content
GROUP BY ROLLUP(to_insert.class_name)
ORDER BY GROUPING(to_insert.class_name), to_insert.class_name;
