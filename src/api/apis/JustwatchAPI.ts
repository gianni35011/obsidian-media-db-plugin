import { APIModel } from '../APIModel';
import { MediaTypeModel } from '../../models/MediaTypeModel';
import MediaDbPlugin from '../../main';
import { MediaType } from '../../utils/MediaType';
import { JustWatchLocale } from '../../utils/JustWatchLocale';
import { SeriesModel } from 'src/models/SeriesModel';
import { MovieModel } from 'src/models/MovieModel';

interface JustWatchData {
	page: number;
	page_size: number;
	total_pages: number;
	total_results: number;
	items: Item[];
}

interface Item {
	jw_entity_id: string;
	id: number;
	title: string;
	full_path: string;
	full_paths: {
		MOVIE_DETAIL_OVERVIEW: string;
	};
	poster: string;
	poster_blur_hash: string;
	original_release_year: number;
	object_type: string;
	offers: Offer[];
	scoring: {
		provider_type: string;
		value: number;
	}[];
}

interface Offer {
	jw_entity_id: string;
	monetization_type: string;
	provider_id: number;
	package_short_name: string;
	retail_price: number;
	last_change_retail_price: number;
	last_change_difference: number;
	last_change_percent: number;
	last_change_date: string;
	last_change_date_provider_id: string;
	currency: string;
	urls: {
		standard_web: string;
		deeplink_android_tv: string;
		deeplink_fire_tv: string;
		deeplink_tvos: string;
		deeplink_tizenos: string;
		deeplink_webos: string;
		deeplink_xbox: string;
		deeplink_rokuos: string;
	};
	presentation_type: string;
	country: string;
}

export class JustwatchAPI extends APIModel {
	plugin: MediaDbPlugin;
	locale: JustWatchLocale = JustWatchLocale.en_AU;
	constructor(plugin: MediaDbPlugin) {
		super();
		this.plugin = plugin;
		this.apiName = 'JustWatch';
		this.apiDescription = 'Unofficial API for JustWatch, find where Series and Movies are streaming.';
		this.apiUrl = 'https://apis.justwatch.com/';
		this.types = [MediaType.Movie, MediaType.Series];
	}
	async searchByTitle(title: string): Promise<MediaTypeModel[]> {
		const searchUrl = `https://apis.justwatch.com/content/titles/${JustWatchLocale}/popular?body=${encodeURIComponent("{ query : "+ title + " ")}`;
		const fetchData = await fetch(searchUrl);
		
		const data = await fetchData.json();
		
		if (data.Response === 'False') {
			if (data.Error === 'Movie not found!') {
				return [];
			}

			throw Error(`MDB | Received error from ${this.apiName}: \n${JSON.stringify(data, undefined, 4)}`);
		}
		if (!data.Search) {
			return [];
		}
		
		const JustwatchResponse: JustWatchData = data;
		const ret: MediaTypeModel[] = [];
		JustwatchResponse.items.forEach((item) => {
			if (item.object_type == 'movie'){
				ret.push(
					new MovieModel({
						type: item.object_type,
						title: item.title,
						englishTitle: item.title,
						year: item.original_release_year.toString(),
						dataSource: this.apiName,
						id: item.jw_entity_id,
					} as MovieModel)
				);
			}
			else if (item.object_type == 'show'){
				ret.push(
					new SeriesModel({
						type: item.object_type,
						title: item.title,
						englishTitle: item.title,
						year: item.original_release_year.toString(),
						dataSource: this.apiName,
						id: item.jw_entity_id,
					} as SeriesModel)
				);
			}
		})
		
		return ret;
	}
	getById(id: string): Promise<MediaTypeModel> {
		throw new Error('Method not implemented.');
	}
	
}