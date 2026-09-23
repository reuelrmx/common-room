const pads = [...document.querySelectorAll("[data-pad]")],
  status = document.querySelector("#status"),
  start = document.querySelector("#start");
let sequence = [],
  position = 0,
  accepting = false,
  generation = 0;
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function flash(index) {
  pads[index].classList.add("lit");
  await pause(500);
  pads[index].classList.remove("lit");
  await pause(200);
}
async function round() {
  accepting = false;
  pads.forEach((p) => (p.disabled = true));
  sequence.push(Math.floor(Math.random() * 4));
  position = 0;
  status.textContent = `Round ${sequence.length}. Watch the signals.`;
  await pause(650);
  const current = generation;
  for (const index of sequence) {
    if (current !== generation) return;
    status.textContent = `Watch: signal ${index + 1}`;
    await flash(index);
  }
  accepting = true;
  pads.forEach((p) => (p.disabled = false));
  status.textContent = `Your turn. Repeat ${sequence.length} ${sequence.length === 1 ? "signal" : "signals"}.`;
}
async function choose(index) {
  if (!accepting) return;
  if (index !== sequence[position]) {
    accepting = false;
    pads.forEach((p) => (p.disabled = true));
    status.textContent = `You completed ${sequence.length - 1} rounds. Try a fresh sequence?`;
    start.disabled = false;
    start.textContent = "Play again";
    return;
  }
  pads[index].classList.add("lit");
  setTimeout(() => pads[index].classList.remove("lit"), 180);
  position++;
  if (position === sequence.length) {
    accepting = false;
    status.textContent = "Good memory. Here comes the next signal.";
    await pause(700);
    round();
  } else
    status.textContent = `Good. ${sequence.length - position} signals to go.`;
}
start.addEventListener("click", () => {
  generation++;
  sequence = [];
  start.disabled = true;
  round();
});
pads.forEach((pad, index) => {
  pad.disabled = true;
  pad.addEventListener("click", () => choose(index));
});
document.addEventListener("keydown", (event) => {
  if (["1", "2", "3", "4"].includes(event.key) && !event.repeat) {
    event.preventDefault();
    choose(Number(event.key) - 1);
  }
});
