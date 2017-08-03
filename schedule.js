"use strict"

// This function is copied from StackOverflow
function getScrollbarWidth() {
    var outer = document.createElement("div");
    outer.style.visibility = "hidden";
    outer.style.width = "100px";
    outer.style.msOverflowStyle = "scrollbar"; // needed for WinJS apps

    document.body.appendChild(outer);

    var widthNoScroll = outer.offsetWidth;
    // force scrollbars
    outer.style.overflow = "scroll";

    // add innerdiv
    var inner = document.createElement("div");
    inner.style.width = "100%";
    outer.appendChild(inner);        

    var widthWithScroll = inner.offsetWidth;

    // remove divs
    outer.parentNode.removeChild(outer);

    return widthNoScroll - widthWithScroll;
}

[].forEach.call(document.getElementsByClassName("dummy-scrollbar"), e => e.style.width=getScrollbarWidth() + "px")

let vm = new Vue({
	el: "#schedule",
	data: {
		hour_px: 100,
		events: [],
		tag_list: [],
		place_list: [],
		current_date: new Date(),
		current_event: null,
		loader: {
			open: false,
			text: "",
		},
		loaded: false,
	},
	computed: {
		placed_events(){
			// categorize events by its place
			let events = this.place_list.reduce((obj, p) => {
				obj[p.name] = []
				return obj
			}, {})
			this.events.reduce((obj, e) => {
				if(Array.isArray(e.place)) {
					e.place.forEach(p => {
						if(typeof obj[p] == "undefined") obj[p] = []
						obj[p].push(e)
					})
				} else {
					if(typeof obj[e.place] == "undefined") obj[e.place] = []
					obj[e.place].push(e)
				}
				return obj
			}, events)

			// sort events in each place
			Object.keys(events).forEach(p => {
				events[p].sort((e1, e2) => e1.begin - e2.begin)
			})

			return events
		},
		dates(){
			const ms_set = new Set(this.events.map(e => moment(e.begin).startOf("day").valueOf()))
			return [...ms_set].sort().map(ms => new Date(ms))
		},
		tags(){
			return this.tag_list.filter(t => t.enabled).map(t => t.name)
		},
		places(){
			return this.place_list.filter(p => p.enabled).map(p => p.name)
		},
		hidden_places(){
			return this.place_list.filter(p => !p.enabled).map(p => p.name)
		},
		visible_events(){
			return this.places.reduce((obj, p) => {
				// filter visible events
				const events_here = this.placed_events[p].map(e => {
					const primary_tag = e.tags.find(t => this.tags.indexOf(t) >= 0)
					if (!primary_tag) return null
					if (e.begin.toDateString() !== this.current_date.toDateString()) return null
					if (e.all_day) return null

					return {
						place: e.place,
						tags: e.tags,
						begin: e.begin,
						end: e.end,
						owner: e.owner,
						subject: e.subject,
						description: e.description,
						classes: ["type" + this.tag_list.findIndex(tag => tag.name === primary_tag)],
					}
				}).filter(e => e)

				this.layout_events(events_here)

				obj[p] = events_here
				return obj
			}, {})
		},
		all_day_events(){
			return this.places.reduce((obj, p) => {
				// filter visible events
				const events_here = this.placed_events[p].map(e => {
					const primary_tag = e.tags.find(t => this.tags.indexOf(t) >= 0)
					if (!primary_tag) return null
					if (e.begin.toDateString() !== this.current_date.toDateString()) return null
					if (!e.all_day) return null

					return {
						place: e.place,
						tags: e.tags,
						begin: e.begin,
						end: e.end,
						owner: e.owner,
						subject: e.subject,
						description: e.description,
						classes: ["type" + this.tag_list.findIndex(tag => tag.name === primary_tag)],
					}
				}).filter(e => e)

				obj[p] = events_here
				return obj
			}, {})
		},
	},
	methods: {
		moment,
		resize_content (hour_px) {
			this.hour_px = hour_px

			let rules = [].slice.call(document.styleSheets).find(s => s.title === "main").cssRules
			Array.prototype.find.call(rules, r => r.selectorText === ".schedule .hour").style.height = this.hour_px + "px"
			Array.prototype.find.call(rules, r => r.selectorText === ".schedule .marker").style.height = this.hour_px / 2 + "px"
			Array.prototype.find.call(rules, r => r.selectorText === ".schedule .marker").style.marginBottom = this.hour_px / 2 + "px"
		},
		resize_scroll(){
			const scroll = document.getElementsByClassName("scroll-wrapper")[0]
			scroll.style.height = (window.innerHeight - scroll.offsetTop - 2) + "px"
		},
		scroll_to_show(){
			const scroll = document.getElementsByClassName("scroll-wrapper")[0]
			scroll.scrollTop = 8.5 * this.hour_px
		},
		add_events(events){
			const places = new Set(events.map(e => e.place))
			const tags = new Set([].concat(...events.map(e => e.tags)))
			places.forEach(p => { this.add_place(p, false) })
			tags.forEach(p => { this.add_tag(p, false) })
			this.events.push(...events)
		},
		add_tag(name, enabled=true) {
			let t = this.tag_list.find(t => t.name === name)
			if(t) t.enabled = t.enabled || enabled
			else this.tag_list.push({name, enabled})
		},
		add_place(name, enabled=true) {
			if(Array.isArray(name)){
				name.forEach(p => {
					this.add_place(p, enabled)
				})
			} else {
				let p = this.place_list.find(p => p.name === name)
				if(p) p.enabled = p.enabled || enabled
				else this.place_list.push({name, enabled})
			}
		},
		px_in_col(time) {
			const minutes = time.getHours() * 60 + time.getMinutes()
			return (this.hour_px*24) * minutes / (60*24)
		},
		display_time(time) {
			return moment(time).format("HH:mm")
		},
		show_event_details(e, $event) {
			this.current_event = e
		},
		layout_events(events){
			let chunks = [], tracks = [], latest = 0

			events.forEach(e => {
				if (e.begin >= latest && tracks.length > 0) {
					// new chunk
					chunks.push(tracks)
					tracks = []
				}

				let track = tracks.find(t => e.begin >= t[t.length-1].end)
				if (track) // add to track
					track.push(e)
				else // new track
					tracks.push([e])

				if (latest < e.end) latest = e.end
			})
			chunks.push(tracks) // finalize

			chunks.forEach(tracks => {
				const w = 96/(tracks.length)
				tracks.forEach((events, i) => {
					events.forEach(e => {
						e.style = {
							top: this.px_in_col(e.begin) + 'px',
							height: this.px_in_col(e.end) - vm.px_in_col(e.begin) + 'px',
							width: w + '%',
							left: w*i + '%',
						}
					})
				})
			})
		},
		load(json_uri){
			axios.get(json_uri, {responseType: "json"}).then(res => {
				const data = res.data

				const events = data.events.map(e => {
					e.begin = new Date(e.begin)
					e.end = new Date(e.end)
					return e
				})
				data.places.forEach(p => { this.add_place(p) })
				data.tags.forEach(t => { this.add_tag(t) })
				this.add_events(events)
				this.current_date = this.dates[0]
			})
		},
		load_submissions(json_uri){
			axios.get(json_uri, {responseType: "json"}).then(res => {
				const context_tag = ["議程"]
				const events = res.data.map(e => ({
					tags: context_tag,
					place: e.room,
					begin: new Date(e.start),
					end: new Date(e.end),
					owner: e.speaker.name,
					subject: e.subject,
					description: e.summary,
					classes: [],
				}))

				this.add_events(events)
				this.add_tag(context_tag[0])
				events.map(e => e.place).forEach(p => { this.add_place(p) })
				this.current_date = this.dates[0]
			})
		},
		load_all(json_links){
			json_links.split("\n").forEach(uri => this.load(uri))
		},
		change_date(dir){
			if(dir > 0) dir = 1
			else if(dir < 0) dir = -1

			let new_index = this.dates.indexOf(this.current_date) + dir
			if(new_index < 0) new_index = 0
			if(new_index >= this.dates.length) new_index = this.dates.length - 1
			this.current_date = this.dates[new_index]
		},
	},
	mounted(){
		this.load_submissions("https://coscup.org/2017-assets/json/submissions.json")

		this.loaded = true
		window.addEventListener('resize', this.resize_scroll)
		this.scroll_to_show()
	},
	updated(){
		this.resize_scroll()
	},
})

