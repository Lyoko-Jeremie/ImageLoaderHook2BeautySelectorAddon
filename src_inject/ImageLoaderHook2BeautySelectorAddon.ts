import type {LifeTimeCircleHook, LogWrapper} from "../../../dist-BeforeSC2/ModLoadController";
import type {AddonPluginHookPointEx} from "../../../dist-BeforeSC2/AddonPlugin";
import type {SC2DataManager} from "../../../dist-BeforeSC2/SC2DataManager";
import type {ModUtils} from "../../../dist-BeforeSC2/Utils";
import type {
    IModImgGetter,
    IModImgGetterLRUCache,
    ImgLruCacheItemType,
    ModBootJson,
    ModImg,
    ModInfo,
} from "../../../dist-BeforeSC2/ModLoader";
import type {ModZipReader} from "../../../dist-BeforeSC2/ModZipReader";
import JSZip from "jszip";
import {isPlainObject, has} from 'lodash';

export interface AddonParams {
    dontCovertMe?: boolean;
}

export function isAddonParams(T: any): T is AddonParams {
    return isPlainObject(T);
}

export class ImageLoaderHook2BeautySelectorAddon implements LifeTimeCircleHook, AddonPluginHookPointEx {
    private logger: LogWrapper;

    constructor(
        public gSC2DataManager: SC2DataManager,
        public gModUtils: ModUtils,
    ) {
        this.logger = gModUtils.getLogger();
        this.gSC2DataManager.getModLoadController().addLifeTimeCircleHook('ImageLoaderHook2BeautySelectorAddon', this);
        this.modImageLoaderHookRef = this.gModUtils.getMod('ImageLoaderHook');
        if (!this.modImageLoaderHookRef) {
            console.error(`[ImageLoaderHook2BeautySelectorAddon] modImageLoaderHook not found!`);
            this.logger.error(`[ImageLoaderHook2BeautySelectorAddon] modImageLoaderHook not found!`);
            return;
        }
        this.nameSetImageLoaderHook.add(this.modImageLoaderHookRef.name);
        this.modImageLoaderHookRef.alias?.forEach(T => this.nameSetImageLoaderHook.add(T));
        this.gSC2DataManager.getAddonPluginManager().registerAddonPlugin(
            'ImageLoaderHook2BeautySelectorAddon',
            'ImageLoaderHook2BeautySelectorAddon',
            this,
        );
    }

    registerMod: (addonName: string, mod: ModInfo, modZip: ModZipReader) => Promise<any> = async () => {
        // noop implementation, all task done in canLoadThisMod
        return;
    }

    modImageLoaderHookRef;

    nameSetImageLoaderHook: Set<string> = new Set();

    convertedModeNameList: string[] = [];

    async canLoadThisMod(bootJson: ModBootJson, zip: JSZip): Promise<boolean> {
        try {
            if (bootJson.addonPlugin?.find(T => T.modName === 'BeautySelectorAddon')) {
                // skip if the mod used BeautySelectorAddon
                return true;
            }
            const config = bootJson.addonPlugin?.find(T =>
                T.modName === 'ImageLoaderHook2BeautySelectorAddon' && T.addonName === 'ImageLoaderHook2BeautySelectorAddon'
            );
            if (isAddonParams(config?.params) && config.params.dontCovertMe) {
                // skip if the mod set dontCovertMe
                console.log(`[ImageLoaderHook2BeautySelectorAddon] canLoadThisMod: skip`, bootJson.name);
                this.logger.log(`[ImageLoaderHook2BeautySelectorAddon] canLoadThisMod: skip[${bootJson.name}]`);
                return true;
            }
            if (bootJson.addonPlugin?.find(T => this.nameSetImageLoaderHook.has(T.modName))) {
                // covert it if the mod used ImageLoaderHook but not BeautySelectorAddon

                // remove ImageLoaderHook from addonPlugin
                bootJson.addonPlugin = bootJson.addonPlugin?.filter(T => !this.nameSetImageLoaderHook.has(T.modName));
                // add BeautySelectorAddon to addonPlugin
                bootJson.addonPlugin.push({
                    modName: 'BeautySelectorAddon',
                    addonName: "BeautySelectorAddon",
                    modVersion: "^2.3.0",
                    params: {}, // run it on typ0 mode
                });
                this.convertedModeNameList.push(bootJson.name);
                console.log(`[ImageLoaderHook2BeautySelectorAddon] canLoadThisMod: converted`, bootJson.name);
                this.logger.log(`[ImageLoaderHook2BeautySelectorAddon] canLoadThisMod: converted[${bootJson.name}]`);
                return true;
            }
            return true;
        } catch (e) {
            console.error(`[ImageLoaderHook2BeautySelectorAddon] canLoadThisMod: error`, e);
            return true;
        }
        return true;
    }

    async ModLoaderLoadEnd() {
        if (!window.modImgLoaderHooker) {
            console.error(`[ImageLoaderHook2BeautySelectorAddon] ModLoaderLoadEnd: window.modImgLoaderHooker not found!`);
            this.logger.error(`[ImageLoaderHook2BeautySelectorAddon] ModLoaderLoadEnd: window.modImgLoaderHooker not found!`);
            return;
        }
        if (!window.addonBeautySelectorAddon) {
            console.error(`[ImageLoaderHook2BeautySelectorAddon] ModLoaderLoadEnd: window.addonBeautySelectorAddon not found!`);
            this.logger.error(`[ImageLoaderHook2BeautySelectorAddon] ModLoaderLoadEnd: window.addonBeautySelectorAddon not found!`);
            return;
        }

        const type0List = new Set<string>(window.addonBeautySelectorAddon.type0ModNameList);

        const covertFailedMod = this.convertedModeNameList.filter(T => !type0List.has(T));
        const covertOkMod = this.convertedModeNameList.filter(T => type0List.has(T));

        window.modImgLoaderHooker.removeModFromImgLookupTable(covertOkMod);

        console.log(`[ImageLoaderHook2BeautySelectorAddon] ModLoaderLoadEnd: convertedModeNameList`, [this.convertedModeNameList, covertOkMod, covertFailedMod]);
        this.logger.log(`[ImageLoaderHook2BeautySelectorAddon] ModLoaderLoadEnd: covertOkMod[${(covertOkMod)}] covertFailedMod[${(covertFailedMod)}]`);
    }
}


