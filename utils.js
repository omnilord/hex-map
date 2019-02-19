function onionskin() {
  var onion = document.getElementById('onionskin');
  if (!onion) {
    console.log('creating onion');
    onion = document.createElement('div');
    onion.id = 'onionskin';
    onion.onclick = function (ev) {
      document.body.removeChild(this);
    }
  }
  document.body.appendChild(onion);
  return onion;
}
