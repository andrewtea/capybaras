import { world, system, EffectType, Effect, TicksPerSecond } from "@minecraft/server";
import { showCapybaraEquipmentUI } from "equipment";
import { playerCooldowns } from "constants";

const COOLDOWN_TICKS = 10;
const CAPYBARA_ID = "capybara:capybara";

world.beforeEvents.playerInteractWithEntity.subscribe((event) => {
    const { player, target } = event;
    if (target.typeId !== CAPYBARA_ID) return;
    if (target.hasComponent("is_baby")) return;
    if (!player.isSneaking) return;

    const now = system.currentTick;
    const last = playerCooldowns.get(player.id);
    if (last && now - last < COOLDOWN_TICKS) return;

    event.cancel = true;
    system.run(() => showCapybaraEquipmentUI(player, target));
});

const PROXIMITY_RADIUS = 10;
const NEAR_CAPYBARA_TAG = "near_capybara";

system.runInterval(() => {
    for (const player of world.getAllPlayers()) {
        const nearbyCapybaras = player.dimension.getEntities({
            location: player.location,
            maxDistance: PROXIMITY_RADIUS,
            type: CAPYBARA_ID,
        });

        const isNearCapybara = nearbyCapybaras.length > 0;
        const wasNearCapybara = player.hasTag(NEAR_CAPYBARA_TAG);

        if (isNearCapybara) {
            //player.sendMessage("§aYou feel a sense of calm in the presence of a capybara.§r");
            player.addEffect("speed", 200)
        } else {
            player.removeEffect("speed");
            //player.sendMessage("§cThe capybara's calming presence has faded.§r");
        }
    }
}, 10);
