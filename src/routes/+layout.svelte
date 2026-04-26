<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '../app.css';

	const { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Flashtune — guess when the music came out</title>
	<meta
		name="description"
		content="A musical timeline guessing game. Place songs from Henry Purcell to Taylor Swift in chronological order."
	/>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap"
	/>
</svelte:head>

{@render children()}
