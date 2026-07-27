-- ============================================================================
-- 0020 — Notify admins when a new Parents Tickets enquiry arrives
-- ----------------------------------------------------------------------------
-- Parents Tickets leads are inserted by the public intake endpoint via the
-- service role (no auth.uid()), so there is no session actor. This trigger
-- fans out a notification to every admin the moment a lead lands — exactly the
-- way new orders and support tickets already do (see 0012). It reuses the
-- shared public.create_notification() helper (SECURITY DEFINER), so the
-- notifications land regardless of the inserting client's RLS.
--
-- Idempotent: safe to run more than once.
-- ============================================================================

create or replace function public.tg_notify_parent_ticket()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_title text;
  v_body text;
  v_route text;
begin
  -- Human title by side of the board; the actor name (the submitter) is
  -- prefixed by the UI, e.g. "Rajesh Kumar submitted a new companion offer".
  v_title := case NEW.enquiry_type
    when 'traveller' then 'submitted a new companion offer'
    when 'requester' then 'submitted a new companion request'
    else 'submitted a new parents ticket'
  end;

  v_route := coalesce(nullif(NEW.from_location, ''), '?')
             || ' → ' || coalesce(nullif(NEW.to_location, ''), '?');
  v_body := NEW.reference_number || ' · ' || v_route;

  for r in select id from public.profiles where role = 'admin' loop
    perform public.create_notification(
      r.id,
      'parent_ticket',
      v_title,
      v_body,
      '/admin/parents-tickets/' || NEW.id,
      null,                               -- no session actor (public intake)
      coalesce(nullif(NEW.full_name, ''), 'A parent')
    );
  end loop;

  return NEW;
end;
$$;

drop trigger if exists trg_notify_parent_ticket on public.parent_ticket_enquiries;
create trigger trg_notify_parent_ticket
  after insert on public.parent_ticket_enquiries
  for each row execute function public.tg_notify_parent_ticket();
