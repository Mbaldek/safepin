-- ============================================================
-- Profile stat counter triggers
-- Keeps profiles.pin_count, vote_count, comment_count,
-- escort_count in sync automatically.
-- ============================================================

-- A. pin_count (pins table)
CREATE OR REPLACE FUNCTION inc_pin_count() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE profiles SET pin_count = pin_count + 1 WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION dec_pin_count() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE profiles SET pin_count = GREATEST(pin_count - 1, 0) WHERE id = OLD.user_id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_inc_pin_count ON pins;
CREATE TRIGGER trg_inc_pin_count
  AFTER INSERT ON pins
  FOR EACH ROW EXECUTE FUNCTION inc_pin_count();

DROP TRIGGER IF EXISTS trg_dec_pin_count ON pins;
CREATE TRIGGER trg_dec_pin_count
  AFTER DELETE ON pins
  FOR EACH ROW EXECUTE FUNCTION dec_pin_count();

-- B. vote_count (pin_votes table)
CREATE OR REPLACE FUNCTION inc_vote_count() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE profiles SET vote_count = vote_count + 1 WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION dec_vote_count() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE profiles SET vote_count = GREATEST(vote_count - 1, 0) WHERE id = OLD.user_id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_inc_vote_count ON pin_votes;
CREATE TRIGGER trg_inc_vote_count
  AFTER INSERT ON pin_votes
  FOR EACH ROW EXECUTE FUNCTION inc_vote_count();

DROP TRIGGER IF EXISTS trg_dec_vote_count ON pin_votes;
CREATE TRIGGER trg_dec_vote_count
  AFTER DELETE ON pin_votes
  FOR EACH ROW EXECUTE FUNCTION dec_vote_count();

-- C. comment_count (pin_comments table)
CREATE OR REPLACE FUNCTION inc_comment_count() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE profiles SET comment_count = comment_count + 1 WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION dec_comment_count() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE profiles SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.user_id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_inc_comment_count ON pin_comments;
CREATE TRIGGER trg_inc_comment_count
  AFTER INSERT ON pin_comments
  FOR EACH ROW EXECUTE FUNCTION inc_comment_count();

DROP TRIGGER IF EXISTS trg_dec_comment_count ON pin_comments;
CREATE TRIGGER trg_dec_comment_count
  AFTER DELETE ON pin_comments
  FOR EACH ROW EXECUTE FUNCTION dec_comment_count();

-- D. escort_count (trip_log table — only completed trips)
CREATE OR REPLACE FUNCTION inc_escort_count() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status = 'completed' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'completed') THEN
    UPDATE profiles SET escort_count = escort_count + 1 WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_inc_escort_count_insert ON trip_log;
CREATE TRIGGER trg_inc_escort_count_insert
  AFTER INSERT ON trip_log
  FOR EACH ROW EXECUTE FUNCTION inc_escort_count();

DROP TRIGGER IF EXISTS trg_inc_escort_count_update ON trip_log;
CREATE TRIGGER trg_inc_escort_count_update
  AFTER UPDATE OF status ON trip_log
  FOR EACH ROW EXECUTE FUNCTION inc_escort_count();

-- ============================================================
-- Backfill existing data
-- ============================================================
UPDATE profiles p SET
  pin_count     = COALESCE((SELECT count(*) FROM pins        WHERE user_id = p.id), 0),
  vote_count    = COALESCE((SELECT count(*) FROM pin_votes   WHERE user_id = p.id), 0),
  comment_count = COALESCE((SELECT count(*) FROM pin_comments WHERE user_id = p.id), 0),
  escort_count  = COALESCE((SELECT count(*) FROM trip_log    WHERE user_id = p.id AND status = 'completed'), 0);
