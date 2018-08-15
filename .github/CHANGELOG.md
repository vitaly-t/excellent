<a name="0.9.1"></a>
# [0.9.1](https://github.com/vitaly-t/excellent/releases/tag/0.9.1) (2018-08-15)

### Breaking Change

Renamed global event `onInit` into `onReady`.

<a name="0.9.0"></a>
# [0.9.0](https://github.com/vitaly-t/excellent/releases/tag/0.9.0) (2018-08-15)

### Breaking Change

Renamed event `onPostInit` into [onReady].

<a name="0.7.8"></a>
# [0.7.8](https://github.com/vitaly-t/excellent/releases/tag/0.7.8) (2018-08-11)

### New Features

All errors that refer to an HTML element now include the starting tag details,
to make it easier to locate the faulty tag in your HTML.

<a name="0.7.5"></a>
# [0.7.5](https://github.com/vitaly-t/excellent/releases/tag/0.7.5) (2018-08-11)

### New Features

Method [EController.extend] now supports parameter `local`.

<a name="0.7.1"></a>
# [0.7.1](https://github.com/vitaly-t/excellent/releases/tag/0.7.1) (2018-08-10)

### New Features

Added new method [ERoot.analyze], to help with debugging applications.

<a name="0.7.0"></a>
# [0.7.0](https://github.com/vitaly-t/excellent/releases/tag/0.7.0) (2018-08-10)

### Bug Fixes

* Resolved major issue [#12]: Accessing extended controllers.

This resulted in major code rework, and introduction of event `onPostInit`.

<a name="0.6.0"></a>
# [0.6.0](https://github.com/vitaly-t/excellent/releases/tag/0.6.0) (2018-08-09)

### Bug Fixes

* Issue [#11] in method `extend`: Extended controllers could not communicate with each other.

[#11]:https://github.com/vitaly-t/excellent/issues/11
[#12]:https://github.com/vitaly-t/excellent/issues/12
[onReady]:https://vitaly-t.github.io/excellent/EController.html#.event:onReady
[ERoot.analyze]:https://vitaly-t.github.io/excellent/ERoot.html#analyze
[EController.extend]:https://vitaly-t.github.io/excellent/EController.html#extend
