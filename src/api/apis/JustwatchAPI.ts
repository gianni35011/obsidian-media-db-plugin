import { APIModel } from '../APIModel';
import { MediaTypeModel } from '../../models/MediaTypeModel';
import MediaDbPlugin from '../../main';
import { MediaType } from '../../utils/MediaType';
import { JustWatchLocale } from '../../utils/JustWatchLocale';
import { JustWatchShortname } from '../../utils/JustWatchShortName';
import { SeriesModel } from 'src/models/SeriesModel';
import { MovieModel } from 'src/models/MovieModel';
import { requestUrl } from 'obsidian';

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
		const body = {
			query: title,
		};
		const searchUrl = `https://apis.justwatch.com/content/titles/${this.locale}/popular?body=${encodeURIComponent(JSON.stringify({ query: title }))}`;

		//Cannot use fetch() due to CORS policy.
		//const fetchData = await fetch(searchUrl);
		const response = await requestUrl(searchUrl);
		const data = response.json;

		if (data.Response === 'False') {
			if (data.Error === 'Movie not found!') {
				return [];
			}

			throw Error(`MDB | Received error from ${this.apiName}: \n${JSON.stringify(data, undefined, 4)}`);
		}
		if (response.status === 400) {
			throw Error(`MDB | Fetch data for ${this.apiName} failed.`);
		}

		const justwatchResponse: JustWatchData = data;
		const ret: MediaTypeModel[] = [];
		justwatchResponse.items.forEach(item => {
			if (item.object_type == 'movie') {
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
			} else if (item.object_type == 'show') {
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
		});

		return ret;
	}

	getStreamingServices(data: JustWatchData){

		return;
	}

	/**
	 * Using JustWatches id (example: ts2077), identify if it is a show or movie then query the api.
	 * @param jw_id JustWatches specific id which identifies if it is a show or movie.
	 * @returns A detailed Modal
	 */
	async getById(jw_id: string): Promise<MediaTypeModel> {
		let type = '';
		let id = '';
		console.log('Getting with ID');

		if (jw_id.startsWith('ts')) {
			type = 'show';
			id = jw_id.substring(2);
		} else if (jw_id.startsWith('tm')) {
			type = 'movie';
			id = jw_id.substring(2);
		} else {
			throw Error(`MDB | Type not found for ${this.apiName} with id of ${jw_id}.`);
		}
		console.log(id);
		console.log(type);

		const searchUrl = `https://apis.justwatch.com/content/titles/${type}/${id}/locale/en_AU`;

		const response = await requestUrl(searchUrl);
		const data = response.json;
		console.log(data);
		if (response.status === 400) {
			throw Error(`MDB | Fetch data for ${this.apiName} failed.`);
		}

		const justwatchResponse: any = data;

		if (type == 'movie') {
			const model = new MovieModel({
				type: type,
				title: justwatchResponse.title,
				englishTitle: justwatchResponse.title,
				year: justwatchResponse.original_release_year.toString(),
				dataSource: this.apiName,
				id: justwatchResponse.id.toString(),
			} as MovieModel);
			return model;
		} else if (type == 'show') {
			const model = new SeriesModel({
				type: type,
				title: justwatchResponse.title,
				englishTitle: justwatchResponse.title,
				year: justwatchResponse.original_release_year.toString(),
				dataSource: this.apiName,
				id: justwatchResponse.id.toString(),
			} as SeriesModel);
			return model;
		}
		return;
	}
}
