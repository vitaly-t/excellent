<a name="0.7.1"></a>
# [0.7.1](https://github.com/vitaly-t/excellent/releases/tag/0.7.1) (2018-08-10)

### New Features

Added new method [ERoot.analyze], to help with debugging applications.

<a name="0.7.0"></a>
# [0.7.0](https://github.com/vitaly-t/excellent/releases/tag/0.7.0) (2018-08-10)

### Bug Fixes

* Resolved major issue [#12]: Accessing extended controllers.

This resulted in major code rework, and introduction of event [onPostInit].

<a name="0.6.0"></a>
# [0.6.0](https://github.com/vitaly-t/excellent/releases/tag/0.6.0) (2018-08-09)

### Bug Fixes

* Issue [#11] in method `extend`: Extended controllers could not communicate with each other.

[#11]:https://github.com/vitaly-t/excellent/issues/11
[#12]:https://github.com/vitaly-t/excellent/issues/12
[onPostInit]:https://vitaly-t.github.io/excellent/EController.html#.event:onPostInit
[ERoot.analyze]:https://vitaly-t.github.io/excellent/ERoot.html#analyze
