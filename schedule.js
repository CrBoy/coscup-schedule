"use strict"

let vm = new Vue({
	el: "#schedule",
	data: {
		current_date: null,
		current_event: null,
		dates_ms: new Set(),
		tag_list: [],
		places: [],
		events: {},
		loaded: false
	},
	computed: {
		dates(){
			return [...this.dates_ms].sort().map(ms => new Date(ms))
		},
		tags(){
			return this.tag_list.filter(t => t.enabled).map(t => t.name)
		},
		hidden_places(){
			return Object.keys(this.events).filter(p => this.places.indexOf(p) < 0)
		},
		visible_events(){
			return this.places.reduce((obj, p) => {
				const events_here = this.events[p].map(e => {
					if (e.begin.toDateString() !== this.current_date.toDateString()) return null

					const primary_tag = e.tags.find(t => this.tags.indexOf(t) >= 0)
					if (primary_tag) {
						return {
							tags: e.tags,
							begin: e.begin,
							end: e.end,
							owner: e.owner,
							subject: e.subject,
							description: e.description,
							classes: ["type" + this.tag_list.findIndex(tag => tag.name === primary_tag)],
							style: {
								top: vm.px_in_col(e.begin) + 'px',
								height: vm.px_in_col(e.end) - vm.px_in_col(e.begin) + 'px'
							}
						}
					} else {
						return null
					}
				}).filter(e => e)

				let chunks = [], tracks = [], latest = 0
				for (let i in events_here) {
					const e = events_here[i]

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
				}
				chunks.push(tracks) // finalize

				chunks.forEach(tracks => {
					const w = 96/(tracks.length)
					tracks.forEach((events, i) => {
						events.forEach(e => {
							e.style.width = w + '%'
							e.style.left = w*i + '%'
						})
					})
				})

				obj[p] = events_here
				return obj
			}, {})
		}
	},
	methods: {
		moment,
		px_in_col(time) {
			const minutes = time.getHours() * 60 + time.getMinutes()
			return (100*24) * minutes / (60*24)
		},
		display_time(time) {
			return moment(time).format("HH:mm")
		},
		show_event_details(e, $event) {
			this.current_event = e
		},
		resize_scroll(){
			const scroll = document.getElementsByClassName("scroll-wrapper")[0]
			scroll.style.height = (window.innerHeight - scroll.offsetTop - 2) + "px"
		},
		scroll_to_show(){
			const scroll = document.getElementsByClassName("scroll-wrapper")[0]
			scroll.scrollTop = 850
		},
		add_events(events){
			const dates_ms = events.map(e => moment(e.begin).startOf("day").valueOf())
			this.add_dates(dates_ms)

			events.reduce((obj, e) => {
				if(typeof obj[e.place] == "undefined") this.$set(obj, e.place, [])
				obj[e.place].push(e)
				return obj
			}, this.events)

			Object.keys(this.events).forEach(p => {
				this.events[p].sort((e1, e2) => e1.begin - e2.begin)
			})
		},
		add_dates(dates_ms){
			this.dates_ms = new Set([...this.dates_ms, ...dates_ms])
		},
	},
	mounted(){
		/*
		axios.get("0804.json", {responseType: "json"}).then(function(res){
			return // FIXME
			let data = res.data
			let events = data.places.reduce((obj, p) => {
				obj[p] = []
				return obj
			}, {})
			data.events.reduce((obj, e) => {
				if(typeof obj[e.place] == "undefined") obj[e.place] = []
				e.classes = []
				obj[e.place].push(e)
				return obj
			}, events)
			Object.keys(events).forEach(function(p){
				let es = events[p]
				es.sort((e1, e2) => e1.begin - e2.begin)
			})

			vm.tag_list = data.tags.map(t => {name: t, enabled: true})
			vm.places = data.places
			vm.events = events
			vm.loaded = true
		})
		*/

		// load submissions
		axios.get("https://coscup.org/2017-assets/json/submissions.json", {responseType: "json"}).then(res => {
			const data = res.data

			// get all dates
			const events = data.map(e => ({
				tags: ["議程"],
				place: e.room,
				begin: new Date(e.start),
				end: new Date(e.end),
				owner: e.speaker.name,
				subject: e.subject,
				description: e.summary,
				classes: [],
			}))


			this.add_events(events)
			this.tag_list.push({name: "議程", enabled: true})
			this.current_date = this.dates[0]
			this.places = Object.keys(this.events)

			this.loaded = true

			this.resize_scroll()
			this.scroll_to_show()
		})
	}
})

