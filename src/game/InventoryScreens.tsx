import { useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { BAG_MAX, CLASSES, EMPTY_BAG, EQUIPMENT, EQUIPMENT_SLOTS, POTION_CARRY_MAX, WEAPONS, equipmentFitsSlot, equipmentIcon, equipmentStatSummary, equipmentTooltip, equipmentTypeSlotName, heroRecruited, isPlayableClassForDisplay, lockpickTooltip, offHandBlocked, potionLabel, potionTooltip, weaponDiceLabel, weaponIcon, weaponPower, weaponRangeLabel, weaponTooltip, weaponsForClass } from "./data";
import type { ClassId, EquipSlot, PotionId, SaveData } from "./types";

const POTIONS: PotionId[] = ["weak", "mid", "potent", "disease", "manaSmall", "manaMid", "manaLarge"];
const BAG_ICON = "/game/icons/equipment/small-leather-pouch.png";

/** Hover card that follows the cursor — `fixed` so overflow-hidden parents don't clip it. */
export function ItemTip({ text, children, className }: { text: string; children: ReactNode; className?: string }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  return (
    <div
      className={className}
      onMouseEnter={(e) => setPos({ x: e.clientX, y: e.clientY })}
      onMouseMove={(e) => setPos({ x: e.clientX, y: e.clientY })}
      onMouseLeave={() => setPos(null)}
    >
      {children}
      {pos && (
        <div
          role="tooltip"
          className="pointer-events-none fixed z-[80] max-w-[16rem] whitespace-pre-line rounded-md border border-border bg-surface px-2.5 py-2 text-left text-[11px] leading-snug text-fg shadow-lg"
          style={{ left: Math.min(pos.x + 14, window.innerWidth - 272), top: Math.min(pos.y + 18, window.innerHeight - 16) }}
        >
          {text}
        </div>
      )}
    </div>
  );
}

/** Paper-doll equipment view for one hero. Clicking a slot opens a picker of compatible
 * OWNED items — Mão Principal lists owned weapons for this class (save.weapons), other
 * slots list owned EQUIPMENT of that slot type from the party's shared, unassigned stash
 * (save.looseEquipment) — gear found in chests lands there, never auto-equipped onto
 * whoever opened the chest, so it shows up here for the player to assign wherever they
 * want. */
export function PaperDollScreen({
  heroName,
  classId,
  save,
  onClose,
  onSwitchToBackpack,
  onEquipWeapon,
  onEquipItem,
  glowSlot = null,
  embedded = false,
}: {
  heroName: string;
  classId: ClassId;
  save: SaveData;
  onClose: () => void;
  onSwitchToBackpack?: () => void;
  onEquipWeapon?: (hero: string, weaponId: string) => void;
  onEquipItem?: (hero: string, slot: EquipSlot, itemId: string | null) => void;
  /** Briefly highlights the slot the same way the Inn glows an open location — for when a
   * weapon/item was just equipped from the Mochila's own list instead of through the
   * picker below, which otherwise gives no indication of where it landed. */
  glowSlot?: "mainHand" | EquipSlot | null;
  embedded?: boolean;
}) {
  const [picker, setPicker] = useState<"mainHand" | EquipSlot | null>(null);
  const weaponId = save.equipped[heroName];
  const weapon = weaponId ? WEAPONS[weaponId] : null;
  const enh = weaponId ? (save.weapons[weaponId] ?? 0) : 0;
  const equip = save.equipment[heroName] ?? {};
  const wearerOf = (itemId: string) => Object.entries(save.equipment).find(([, slots]) => Object.values(slots).includes(itemId))?.[0];
  const ownedWeapons = [...weaponsForClass(classId)].filter((w) => save.weapons[w.id] != null).sort((a, b) => weaponPower(a) - weaponPower(b));

  return (
    <div
      className={embedded ? "relative z-0 h-full min-w-0 overflow-hidden" : "absolute inset-0 z-40 flex items-center justify-center bg-bg/85 p-4"}
      onClick={(e) => {
        if (!embedded && e.target === e.currentTarget) onClose();
      }}
    >
      <div className={embedded ? "h-full min-h-0 w-full ember-scrollbar overflow-y-auto overflow-x-hidden rounded-xl border border-border bg-surface p-4" : "w-full max-w-md max-h-[88dvh] overflow-y-auto bg-surface border border-border rounded-xl p-5"}>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <p className="font-display text-xl leading-tight">{heroName}</p>
            <p className="text-xs text-muted">{CLASSES[classId].name}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onSwitchToBackpack && (
              <button type="button" onClick={onSwitchToBackpack} className="h-12 px-3 rounded-md border border-border text-xs flex items-center gap-2">
                <img src={BAG_ICON} alt="" className="size-8 shrink-0 rounded-sm object-contain" />
                Mochila
              </button>
            )}
            <button type="button" onClick={onClose} className="size-8 grid place-items-center rounded-md border border-border" aria-label="Fechar">
              <X className="size-4" />
            </button>
          </div>
        </div>

        <p className="text-xs uppercase tracking-[0.18em] text-muted mb-2">Mão Principal</p>
        <div className="mb-4">
          <ItemTip text={weapon ? weaponTooltip(weapon, enh) : "Mão principal · vazia"} className="block">
            <button
              type="button"
              disabled={!onEquipWeapon}
              onClick={() => setPicker("mainHand")}
              className={`w-full flex items-center gap-2 rounded-md border px-2 py-1.5 text-left disabled:cursor-default bg-bg ${glowSlot === "mainHand" ? "inn-open" : "border-border"}`}
            >
              {weapon ? (
                <>
                  <img src={weaponIcon(weapon.id)} alt="" className="size-9 rounded-sm object-cover shrink-0" />
                  <span className="flex-1 text-sm min-w-0">
                    {weapon.name} {enh > 0 ? `+${enh}` : ""}
                    <span className="block text-[11px] text-muted tabular-nums">
                      {weaponDiceLabel(weapon.id)} · {weaponRangeLabel(weapon.id)}
                    </span>
                    {weapon.bonusClass && isPlayableClassForDisplay(weapon.bonusClass) && (
                      <span className={`block text-[11px] tabular-nums ${weapon.bonusClass === classId ? "text-accent" : "text-muted"}`}>
                        +10% dano · {CLASSES[weapon.bonusClass].name}
                      </span>
                    )}
                  </span>
                </>
              ) : (
                <p className="text-sm text-muted">Vazia · equipe com o Ferreiro na Estalagem</p>
              )}
            </button>
          </ItemTip>
          {weapon && onEquipWeapon && (
            <button
              type="button"
              onClick={() => onEquipWeapon(heroName, "")}
              className="mt-1 w-full rounded-md border border-border bg-bg px-2 py-1 text-[11px]"
            >
              Desequipar
            </button>
          )}
        </div>

        <p className="text-xs uppercase tracking-[0.18em] text-muted mb-2">Equipamento</p>
        <div className="grid grid-cols-2 gap-1.5">
          {EQUIPMENT_SLOTS.map((s) => {
            const itemId = equip[s.id];
            const item = itemId ? EQUIPMENT[itemId] : null;
            const tip = item ? equipmentTooltip(item) : `${s.label} · vazio`;
            return (
              <div key={s.id}>
                <ItemTip text={tip} className="block">
                  <button
                    type="button"
                    onClick={() => setPicker(s.id)}
                    className={`w-full rounded-md border px-2 py-1.5 text-left flex items-center gap-2 bg-bg ${glowSlot === s.id ? "inn-open" : "border-border"}`}
                  >
                    <span className="flex-1 min-w-0">
                      <span className="block text-[10px] uppercase tracking-wide text-muted">{s.label}</span>
                      <span className="block text-xs truncate text-fg/90">{item ? item.name : "Vazio"}</span>
                      {item && (
                        <span className="block text-[10px] text-muted truncate">
                          {item.kind === "shield"
                            ? `Escudo · ${Math.round((item.dmgMul ?? 0.75) * 100)}% dano`
                            : item.kind === "weapon"
                              ? `${item.dice}D${item.faces} · Mão secundária`
                              : equipmentStatSummary(item) || equipmentTypeSlotName(item)}
                        </span>
                      )}
                    </span>
                    {item ? (
                      <img src={equipmentIcon(item.id)} alt="" className="size-9 rounded-sm object-cover shrink-0" />
                    ) : (
                      <span className="size-9 rounded-sm border border-dashed border-border shrink-0" aria-hidden="true" />
                    )}
                  </button>
                </ItemTip>
                {item && onEquipItem && (
                  <button
                    type="button"
                    onClick={() => onEquipItem(heroName, s.id, null)}
                    className="mt-1 w-full rounded-md border border-border bg-bg px-2 py-0.5 text-[10px]"
                  >
                    Desequipar
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {picker != null && (
        <div
          className="absolute inset-0 z-50 bg-bg/85 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPicker(null);
          }}
        >
          <div className="w-full max-w-sm max-h-[80dvh] overflow-y-auto bg-surface border border-border rounded-xl p-5">
            <div className="flex items-center justify-between gap-3 mb-3">
              <p className="font-display text-lg leading-tight">{picker === "mainHand" ? "Mão Principal" : EQUIPMENT_SLOTS.find((s) => s.id === picker)?.label}</p>
              <button type="button" onClick={() => setPicker(null)} className="size-8 grid place-items-center rounded-md border border-border" aria-label="Fechar">
                <X className="size-4" />
              </button>
            </div>

            {picker === "mainHand" ? (
              <>
                {weapon && onEquipWeapon && (
                  <button
                    type="button"
                    onClick={() => {
                      onEquipWeapon(heroName, "");
                      setPicker(null);
                    }}
                    className="w-full mb-2 rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-left"
                  >
                    Desequipar
                  </button>
                )}
                {ownedWeapons.length > 0 ? (
                <div className="flex flex-col gap-1.5">
                  {ownedWeapons.map((w) => (
                    <ItemTip key={w.id} text={weaponTooltip(w, save.weapons[w.id] ?? 0)}>
                      <button
                        type="button"
                        onClick={() => {
                          onEquipWeapon?.(heroName, w.id);
                          setPicker(null);
                        }}
                        disabled={w.id === weaponId}
                        className="w-full flex items-center gap-2 bg-bg border border-border rounded-md px-2 py-1.5 text-left disabled:opacity-50"
                      >
                        <img src={weaponIcon(w.id)} alt="" className="size-9 rounded-sm object-cover shrink-0" />
                        <span className="flex-1 text-sm min-w-0">
                          {w.name} {save.weapons[w.id] ? `+${save.weapons[w.id]}` : ""}
                          <span className="block text-[11px] text-muted tabular-nums">
                            {weaponDiceLabel(w.id)} · {weaponRangeLabel(w.id)}
                          </span>
                          {w.bonusClass && isPlayableClassForDisplay(w.bonusClass) && (
                            <span className={`block text-[11px] tabular-nums ${w.bonusClass === classId ? "text-accent" : "text-muted"}`}>
                              +10% dano · {CLASSES[w.bonusClass].name}
                            </span>
                          )}
                        </span>
                        {w.id === weaponId && <span className="text-[11px] text-muted shrink-0">Equipada</span>}
                      </button>
                    </ItemTip>
                  ))}
                </div>
                ) : (
                  <p className="text-sm text-muted">Nenhuma arma no saco ainda. Compre uma com o Ferreiro.</p>
                )}
              </>
            ) : picker === "offHand" && offHandBlocked(weaponId ?? null) ? (
              <p className="text-sm text-muted">Arma principal de duas mãos — sem mão livre para a secundária.</p>
            ) : (
              (() => {
                const slot = picker as EquipSlot;
                const otherRing = slot === "ring1" ? equip.ring2 : slot === "ring2" ? equip.ring1 : undefined;
                const options = Object.values(EQUIPMENT).filter(
                  (it) =>
                    equipmentFitsSlot(it, slot) &&
                    ((save.looseEquipment[it.id] ?? 0) > 0 || !!wearerOf(it.id)) &&
                    (!it.usableBy || it.usableBy.includes(classId)),
                );
                const wornHere = equip[slot];
                return (
                  <div className="flex flex-col gap-1.5">
                    {wornHere && onEquipItem && (
                      <button
                        type="button"
                        onClick={() => {
                          onEquipItem(heroName, slot, null);
                          setPicker(null);
                        }}
                        className="w-full rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-left"
                      >
                        Desequipar
                      </button>
                    )}
                    {options.length > 0 ? (
                      options.map((it) => {
                        const equipped = equip[slot] === it.id;
                        const owned = save.looseEquipment[it.id] ?? 0;
                        const wearer = wearerOf(it.id);
                        const onOtherFinger = otherRing === it.id && owned <= 0;
                        return (
                          <ItemTip key={it.id} text={equipmentTooltip(it)}>
                            <button
                              type="button"
                              disabled={equipped || onOtherFinger || !onEquipItem}
                              onClick={() => {
                                onEquipItem?.(heroName, slot, it.id);
                                setPicker(null);
                              }}
                              className="w-full flex items-center gap-2 bg-bg border border-border rounded-md px-2 py-1.5 text-left disabled:opacity-50"
                            >
                              <img src={equipmentIcon(it.id)} alt="" className="size-9 rounded-sm object-cover shrink-0" />
                              <span className="flex-1 text-sm min-w-0">
                                {it.name} {owned > 1 ? `×${owned}` : ""}
                                <span className="block text-[10px] uppercase tracking-wide text-muted">{equipmentTypeSlotName(it)}</span>
                                <span className="block text-[11px] text-muted">
                                  {it.kind === "shield"
                                    ? `Investida de Escudo · ${Math.round((it.dmgMul ?? 0.75) * 100)}% dano · 70% atordoa`
                                    : it.kind === "weapon"
                                      ? `${it.dice}D${it.faces} · Mão secundária`
                                      : equipmentStatSummary(it)}
                                </span>
                              </span>
                              {equipped && <span className="text-[11px] text-muted shrink-0">Equipado</span>}
                              {onOtherFinger && <span className="text-[11px] text-muted shrink-0">já no outro anel</span>}
                              {!equipped && !onOtherFinger && wearer && <span className="text-[11px] text-muted shrink-0">em {wearer}</span>}
                            </button>
                          </ItemTip>
                        );
                      })
                    ) : (
                      <p className="text-sm text-muted">Nenhum item no baú do grupo pra esse espaço ainda.</p>
                    )}
                  </div>
                );
              })()
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Backpack overview: this hero's potions/gazuas plus the party's shared weapon and equipment stash. */
export function BackpackScreen({
  heroName,
  classId,
  save,
  onClose,
  onSwitchToDoll,
  onEquipWeapon,
  onEquipItem,
  embedded = false,
}: {
  heroName: string;
  classId?: ClassId;
  save: SaveData;
  onClose: () => void;
  onSwitchToDoll?: () => void;
  /** Clicking a weapon here equips it straight onto this hero — only offered when the
   * weapon actually fits their class (see weaponsForClass below). */
  onEquipWeapon?: (hero: string, weaponId: string) => void;
  /** Same, for a piece of shared Equipamento — only offered when it fits the hero's class
   * and a slot for it is actually free to pick automatically (see targetSlotFor below). */
  onEquipItem?: (hero: string, slot: EquipSlot, itemId: string | null) => void;
  embedded?: boolean;
}) {
  const bag = save.bags[heroName] ?? EMPTY_BAG;
  const weaponEntries = Object.entries(save.weapons).filter(([id]) => {
    const wielder = Object.entries(save.equipped).find(([, v]) => v === id)?.[0];
    return !wielder || heroRecruited(wielder, save.completed);
  });
  const wearerOf = (id: string) =>
    Object.entries(save.equipment).find(([, slots]) => Object.values(slots).includes(id))?.[0];
  const sharedEquipmentIds = new Set([
    ...Object.keys(save.looseEquipment),
    ...Object.values(save.equipment).flatMap((slots) => Object.values(slots)),
  ]);
  const equipmentEntries = [...sharedEquipmentIds]
    .map((id) => [
      id,
      (save.looseEquipment[id] ?? 0) + Object.values(save.equipment).reduce((total, slots) => total + Object.values(slots).filter((equippedId) => equippedId === id).length, 0),
    ] as const)
    .filter(([id]) => {
      const wearer = wearerOf(id);
      return !wearer || heroRecruited(wearer, save.completed);
    });
  // The 30-slot count is the magic bag of holding for the party's shared weapons/equipment
  // stash — potions and lockpicks are each hero's own separate per-kind stack (see
  // POTION_CARRY_MAX/BAG_MAX below) and never count against it.
  const bagCount = weaponEntries.length + equipmentEntries.reduce((n, [, qty]) => n + qty, 0);
  const bagCapacity = 30;
  const heroEquip = save.equipment[heroName] ?? {};
  /** Which slot a click-to-equip should fill: rings pick whichever finger is free (ring1
   * first), everything else has exactly one slot — except offHand, which has none at all
   * while the main hand holds a two-handed weapon. Returns null when there's nowhere for
   * it to go automatically (the picker on the doll itself still handles that case). */
  const targetSlotFor = (item: (typeof EQUIPMENT)[string]): EquipSlot | null => {
    if (item.slot === "ring1" || item.slot === "ring2") return heroEquip.ring1 ? "ring2" : "ring1";
    if (item.slot === "offHand" && offHandBlocked(save.equipped[heroName] ?? null)) return null;
    return item.slot;
  };

  return (
    <div
      className={embedded ? "relative z-0 h-full min-w-0 overflow-hidden" : "absolute inset-0 z-40 flex items-center justify-center bg-bg/85 p-4"}
      onClick={(e) => {
        if (!embedded && e.target === e.currentTarget) onClose();
      }}
    >
      <div className={embedded ? "relative h-full min-h-0 w-full ember-scrollbar overflow-y-auto overflow-x-hidden rounded-xl border border-border p-4" : "relative w-full max-w-md max-h-[88dvh] overflow-y-auto border border-border rounded-xl p-5"}>
        <img src="/game/assets/backpack-bg.jpg" alt="" className="absolute inset-0 h-full w-full object-cover rounded-xl blur-[5px] scale-110 -z-10" />
        <div className="absolute inset-0 bg-bg/55 rounded-xl -z-10" />
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <img src={BAG_ICON} alt="" className="size-10 shrink-0 rounded-sm object-contain" />
              <p className="font-display text-xl leading-tight drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">Mochila</p>
            </div>
            <p className="text-xs text-fg/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{heroName}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onSwitchToDoll && (
              <button type="button" onClick={onSwitchToDoll} className="h-8 px-2.5 rounded-md border border-border bg-bg/80 text-xs">
                Equipar
              </button>
            )}
            <button type="button" onClick={onClose} className="size-8 grid place-items-center rounded-md border border-border bg-bg/80" aria-label="Fechar">
              <X className="size-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between bg-bg border border-border rounded-md px-2 py-1.5">
            <p className="text-sm">Ember</p>
            <p className="text-sm tabular-nums text-muted">×{save.ember ?? 0}</p>
          </div>
          {POTIONS.map((kind) => (
            <ItemTip key={kind} text={potionTooltip(kind)} className="block">
              <div className="flex items-center gap-1.5 bg-bg border border-border rounded-md px-2 py-1.5">
                <img src={`/game/icons/potion-${kind}.png?v=ds2`} alt="" className="size-6 rounded-sm object-cover shrink-0" />
                <p className="flex-1 text-sm truncate">
                  {potionLabel(kind)}
                  <span className="block text-[10px] uppercase tracking-wide text-muted">Consumível</span>
                </p>
                <p className="text-sm tabular-nums text-muted">
                  {bag[kind] ?? 0} / {POTION_CARRY_MAX[kind]}
                </p>
              </div>
            </ItemTip>
          ))}
          <ItemTip text={lockpickTooltip()} className="block">
            <div className="flex items-center gap-1.5 bg-bg border border-border rounded-md px-2 py-1.5">
              <img src="/game/icons/lockpick.png" alt="" className="size-6 rounded-sm object-cover shrink-0" />
              <p className="flex-1 text-sm truncate">
                Gazua
                <span className="block text-[10px] uppercase tracking-wide text-muted">Consumível</span>
              </p>
              <p className="text-sm tabular-nums text-muted">{bag.lockpick ?? 0} / {BAG_MAX}</p>
            </div>
          </ItemTip>
        </div>

        {weaponEntries.length > 0 && (
          <>
            <div className="flex items-baseline justify-between gap-2 mt-4 mb-2">
              <p className="text-xs uppercase tracking-[0.18em] text-muted">Armas do grupo</p>
              <p className={`text-[11px] tabular-nums ${bagCount >= bagCapacity ? "text-danger" : "text-muted"}`}>
                {bagCount} / {bagCapacity} itens
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              {weaponEntries.map(([id, enh]) => {
                const w = WEAPONS[id];
                if (!w) return null;
                const wielder = Object.entries(save.equipped).find(([, v]) => v === id)?.[0];
                const isThisHeros = wielder === heroName;
                const fitsClass = !!classId && weaponsForClass(classId).some((cw) => cw.id === id);
                const canEquip = !!onEquipWeapon && fitsClass && !isThisHeros;
                const content = (
                  <>
                    <img src={weaponIcon(id)} alt="" className="size-6 rounded-sm object-cover shrink-0" />
                    <p className="flex-1 text-sm min-w-0 truncate">
                      {w.name} {enh > 0 ? `+${enh}` : ""}
                      <span className="block text-[10px] uppercase tracking-wide text-muted">Mão principal</span>
                    </p>
                    <p className="text-[11px] text-muted shrink-0">{isThisHeros ? "equipada" : wielder ? `em ${wielder}` : "reserva"}</p>
                  </>
                );
                return (
                  <ItemTip key={id} text={weaponTooltip(w, enh)} className="block">
                    {canEquip ? (
                      <button
                        type="button"
                        onClick={() => onEquipWeapon(heroName, id)}
                        className="w-full flex items-center gap-1.5 bg-bg border border-border rounded-md px-2 py-1.5 text-left"
                      >
                        {content}
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 bg-bg border border-border rounded-md px-2 py-1.5">{content}</div>
                    )}
                  </ItemTip>
                );
              })}
            </div>
          </>
        )}

        {equipmentEntries.length > 0 && (
          <>
            <p className="text-xs uppercase tracking-[0.18em] text-muted mt-4 mb-2">Equipamento do grupo</p>
            <div className="flex flex-col gap-1.5">
              {equipmentEntries.map(([id, count]) => {
                const it = EQUIPMENT[id];
                if (!it) return null;
                const wearer = wearerOf(id);
                const isThisHeros = wearer === heroName;
                const fitsClass = !!classId && (!it.usableBy || it.usableBy.includes(classId));
                const targetSlot = classId ? targetSlotFor(it) : null;
                const canEquip = !!onEquipItem && fitsClass && !isThisHeros && !!targetSlot;
                const content = (
                  <>
                    <img src={equipmentIcon(id)} alt="" className="size-6 rounded-sm object-cover shrink-0" />
                    <p className="flex-1 text-sm min-w-0 truncate">
                      {it.name} {count > 1 ? `×${count}` : ""}
                      <span className="block text-[10px] uppercase tracking-wide text-muted">{equipmentTypeSlotName(it)}</span>
                    </p>
                    <p className="text-[11px] text-muted shrink-0">{isThisHeros ? "equipado" : wearer ? `em ${wearer}` : "reserva"}</p>
                  </>
                );
                return (
                  <ItemTip key={id} text={equipmentTooltip(it)} className="block">
                    {canEquip ? (
                      <button
                        type="button"
                        onClick={() => onEquipItem(heroName, targetSlot, id)}
                        className="w-full flex items-center gap-1.5 bg-bg border border-border rounded-md px-2 py-1.5 text-left"
                      >
                        {content}
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 bg-bg border border-border rounded-md px-2 py-1.5">{content}</div>
                    )}
                  </ItemTip>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** One inventory action opens the hero's personal consumables beside the party's equipment
 * sheet. The grid never exceeds its container; narrow screens stack vertically instead of
 * producing a horizontal scrollbar. */
export function PartyInventoryOverlay({
  heroName,
  classId,
  save,
  onClose,
  onEquipWeapon,
  onEquipItem,
}: {
  heroName: string;
  classId: ClassId;
  save: SaveData;
  onClose: () => void;
  onEquipWeapon?: (hero: string, weaponId: string) => void;
  onEquipItem?: (hero: string, slot: EquipSlot, itemId: string | null) => void;
}) {
  // Equipping straight from the Mochila's shared lists (rather than through a picker on
  // the doll itself) has no other feedback showing where it landed — with a long list,
  // "which slot did that just fill?" isn't obvious. Flash the same glow the Inn uses for
  // a couple seconds on the slot it just filled.
  const [glowSlot, setGlowSlot] = useState<"mainHand" | EquipSlot | null>(null);
  const glowTimer = useRef<number | null>(null);
  const flashGlow = (slot: "mainHand" | EquipSlot) => {
    if (glowTimer.current !== null) window.clearTimeout(glowTimer.current);
    setGlowSlot(slot);
    glowTimer.current = window.setTimeout(() => setGlowSlot(null), 1800);
  };
  const handleEquipWeapon = (hero: string, weaponId: string) => {
    onEquipWeapon?.(hero, weaponId);
    if (weaponId) flashGlow("mainHand");
  };
  const handleEquipItem = (hero: string, slot: EquipSlot, itemId: string | null) => {
    onEquipItem?.(hero, slot, itemId);
    if (itemId) flashGlow(slot);
  };
  useEffect(() => () => {
    if (glowTimer.current !== null) window.clearTimeout(glowTimer.current);
  }, []);
  return (
    <div
      className="absolute inset-0 z-40 grid place-items-center bg-bg/85 p-3 sm:p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="grid h-[min(88dvh,48rem)] w-full max-w-6xl min-w-0 grid-cols-1 gap-3 overflow-x-hidden overflow-y-auto lg:grid-cols-2 lg:overflow-y-hidden">
        <BackpackScreen
          heroName={heroName}
          classId={classId}
          save={save}
          onClose={onClose}
          onEquipWeapon={onEquipWeapon && handleEquipWeapon}
          onEquipItem={onEquipItem && handleEquipItem}
          embedded
        />
        <PaperDollScreen
          heroName={heroName}
          classId={classId}
          save={save}
          onClose={onClose}
          onEquipWeapon={onEquipWeapon}
          onEquipItem={onEquipItem}
          glowSlot={glowSlot}
          embedded
        />
      </div>
    </div>
  );
}