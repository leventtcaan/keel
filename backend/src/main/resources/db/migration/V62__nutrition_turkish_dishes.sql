-- Turkish home dishes and a search that finds them by their plain letters (K-1213, ADR-088 Ek 2). Small and quick: no row of
-- the food table is rewritten here and no index is built (the table has about two million rows, and a deploy waits for the
-- migrations). The folded search text is filled in the background (SearchFoldBackfill) and indexed by V63.

-- A dish is a source of generic foods beside Foundation, SR Legacy and Survey, and a dataset of its own (an FDC or Open Food
-- Facts import never touches it). Its English names, searched but not shown.
alter table nutrition.food
    drop constraint food_source_check;
alter table nutrition.food
    add constraint food_source_check check (source in ('FOUNDATION', 'SR_LEGACY', 'FNDDS', 'BRANDED', 'RECIPE'));
alter table nutrition.food
    drop constraint food_dataset_check;
alter table nutrition.food
    add constraint food_dataset_check check (dataset in ('FDC', 'OFF', 'RECIPE'));
alter table nutrition.food
    add column aliases text;

-- The dishes file recorded as the other imports are (release = its version; foods = dishes written, skipped = dishes left out),
-- and the folded text's backfill (release progress while it runs, done when every row has it).
alter table nutrition.food_import
    drop constraint food_import_dataset_check;
alter table nutrition.food_import
    add constraint food_import_dataset_check check (dataset in ('FOUNDATION', 'SR_LEGACY', 'FNDDS', 'BRANDED', 'RECIPE', 'SEARCH_FOLDED')
        or dataset ~ '^OFF(_[A-Z]{2})?$');

-- The text the name search matches, folded: composed (NFC), every Turkish letter as its plain one (ı İ ş ğ ç ö ü as i s g c o u)
-- and the dot a decomposed İ leaves dropped (the last letter of the first list has no partner, translate() deletes it), then lower
-- case. The code folds a query the same way (FoodSearchTerms, one list). It is a plain column, null until filled: the old
-- generated search_text (V52) stays and serves the search until the backfill is done.
alter table nutrition.food
    add column search_folded text;

create function nutrition.fold_text(value text) returns text
    language sql immutable parallel safe
    return lower(translate(normalize(value, nfc), 'ıİşŞğĞçÇöÖüÜ' || chr(775), 'iisSgGcCoOuU'));

-- Every new or changed row gets its folded text on write (name, brand and the dish's English names).
create function nutrition.food_fold_search() returns trigger
    language plpgsql as
$$
begin
    new.search_folded := nutrition.fold_text(new.name || ' ' || coalesce(new.brand, '') || ' ' || coalesce(new.aliases, ''));
    return new;
end
$$;

create trigger food_fold_search
    before insert or update of name, brand, aliases
    on nutrition.food
    for each row
execute function nutrition.food_fold_search();
